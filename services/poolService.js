import { ethers } from 'ethers';
import { Pool, nearestUsableTick, TickMath, TICK_SPACINGS } from '@uniswap/v3-sdk';
import { getProvider } from '../utils/provider.js';
import { getChainConfig, FEE_TIERS } from '../config/chains.js';
import { POOL_ABI, FACTORY_ABI } from '../config/abis.js';
import JSBI from 'jsbi';

/**
 * Get pool address from factory
 */
export async function getPoolAddress(chain, token0, token1, fee) {
  const provider = getProvider(chain);
  const config = getChainConfig(chain);
  
  const factory = new ethers.Contract(config.factory, FACTORY_ABI, provider);
  const poolAddress = await factory.getPool(token0.address, token1.address, fee);
  
  if (poolAddress === ethers.ZeroAddress) {
    throw new Error(`Pool does not exist for ${token0.symbol}/${token1.symbol} with fee ${fee}`);
  }
  
  return poolAddress;
}

/**
 * Get pool instance with current state
 */
export async function getPool(chain, token0, token1, fee) {
  const provider = getProvider(chain);
  const poolAddress = await getPoolAddress(chain, token0, token1, fee);
  
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  
  // Fetch pool state
  const [slot0, liquidity, token0Address, token1Address, poolFee, tickSpacing] = await Promise.all([
    poolContract.slot0(),
    poolContract.liquidity(),
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.tickSpacing()
  ]);
  
  // Ensure token order matches pool
  const [tokenA, tokenB] = token0Address.toLowerCase() === token0.address.toLowerCase()
    ? [token0, token1]
    : [token1, token0];
  
  // Convert to JSBI for Pool constructor
  const sqrtPriceX96JSBI = JSBI.BigInt(slot0.sqrtPriceX96.toString());
  const liquidityJSBI = JSBI.BigInt(liquidity.toString());
  const tickNum = Number(slot0.tick);
  
  // Create pool instance
  const pool = new Pool(
    tokenA,
    tokenB,
    Number(poolFee),
    sqrtPriceX96JSBI,
    liquidityJSBI,
    tickNum
  );
  
  return {
    pool,
    poolAddress,
    slot0,
    liquidity,
    tickSpacing: Number(tickSpacing)
  };
}

/**
 * Get all available pools for a token pair
 */
export async function getAllPools(chain, token0, token1) {
  const pools = [];
  const feeTiers = Object.values(FEE_TIERS);
  
  for (const fee of feeTiers) {
    try {
      const poolData = await getPool(chain, token0, token1, fee);
      pools.push({
        fee,
        ...poolData
      });
    } catch (error) {
      // Pool doesn't exist for this fee tier, skip
      console.log(`Pool not found for ${token0.symbol}/${token1.symbol} fee ${fee} on ${chain}: ${error.message}`);
      continue;
    }
  }
  
  return pools;
}

/**
 * Get liquidity depth around current price
 */
export async function getLiquidityDepth(chain, poolAddress, currentTick, tickSpacing, range = 100) {
  const provider = getProvider(chain);
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  
  // Calculate tick range to query
  const tickLower = nearestUsableTick(currentTick - (tickSpacing * range), tickSpacing);
  const tickUpper = nearestUsableTick(currentTick + (tickSpacing * range), tickSpacing);
  
  const ticksData = [];
  
  // Query ticks in batches
  for (let tick = tickLower; tick <= tickUpper; tick += tickSpacing) {
    ticksData.push(tick);
  }
  
  // Limit to 40 ticks max and fetch in parallel batches of 10
  const limitedTicks = ticksData.slice(0, 40);
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < limitedTicks.length; i += batchSize) {
    const batch = limitedTicks.slice(i, i + batchSize);
    const batchPromises = batch.map(async (tick) => {
      try {
        const tickInfo = await poolContract.ticks(tick);
        if (tickInfo.liquidityGross > 0n) {
          return {
            tick,
            liquidityGross: tickInfo.liquidityGross.toString(),
            liquidityNet: tickInfo.liquidityNet.toString(),
            initialized: tickInfo.initialized
          };
        }
      } catch (error) {
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null));
  }
  
  return results;
}

/**
 * Calculate price from tick
 */
export function tickToPrice(tick, token0Decimals, token1Decimals) {
  const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
  // Convert JSBI to string for safe conversion
  const sqrtPriceX96Str = JSBI.toNumber ? sqrtPriceX96.toString() : sqrtPriceX96.toString();
  const sqrtPriceNum = Number(sqrtPriceX96Str);
  const price = (sqrtPriceNum / 2**96) ** 2;
  const adjustedPrice = price * (10 ** (token0Decimals - token1Decimals));
  return adjustedPrice;
}
