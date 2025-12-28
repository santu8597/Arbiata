import { getPool, getLiquidityDepth, tickToPrice } from './poolService.js';
import { getChainConfig, FEE_TIERS } from '../config/chains.js';

/**
 * Categorize liquidity depth as low, mid, or high
 */
function categorizeLiquidityDepth(liquidityUSD, ticksWithLiquidity, tickData) {
  // Calculate total liquidity across ticks
  const totalTickLiquidity = tickData.reduce((sum, tick) => {
    return sum + BigInt(tick.liquidityGross);
  }, BigInt(0));
  
  const totalTickLiquidityNum = Number(totalTickLiquidity.toString()) / 1e18;
  
  // Thresholds for categorization
  const thresholds = {
    usdLow: 1000000,      // $1M
    usdMid: 5000000,      // $5M
    ticksLow: 10,
    ticksMid: 30
  };
  
  let score = 0;
  
  // Score based on USD liquidity
  if (liquidityUSD >= thresholds.usdMid) score += 2;
  else if (liquidityUSD >= thresholds.usdLow) score += 1;
  
  // Score based on number of active ticks
  if (ticksWithLiquidity >= thresholds.ticksMid) score += 2;
  else if (ticksWithLiquidity >= thresholds.ticksLow) score += 1;
  
  // Categorize
  if (score >= 3) return 'high';
  if (score >= 1) return 'mid';
  return 'low';
}

/**
 * Get liquidity information for ETH pools
 */
export async function getETHLiquidity(chain, fee = FEE_TIERS.MEDIUM) {
  try {
    const config = getChainConfig(chain);
    const { WETH, USDC, USDbC } = config.tokens;
    
    // Try USDC first, then USDbC for Base chain
    let poolData;
    let stablecoin = USDC;
    try {
      poolData = await getPool(chain, WETH, USDC, fee);
    } catch (error) {
      if (USDbC) {
        poolData = await getPool(chain, WETH, USDbC, fee);
        stablecoin = USDbC;
      } else {
        throw error;
      }
    }
    const { pool, slot0, liquidity, poolAddress, tickSpacing } = poolData;
    
    const currentTick = Number(slot0.tick);
    const token0 = pool.token0;
    const token1 = pool.token1;
    
    // Get liquidity depth (reduced range for faster response)
    const liquidityDepthData = await getLiquidityDepth(
      chain,
      poolAddress,
      currentTick,
      tickSpacing,
      20 // query only 20 ticks on each side instead of 50
    );
    
    // Calculate total liquidity in USD
    const isToken0WETH = token0.address.toLowerCase() === WETH.address.toLowerCase();
    const currentPrice = isToken0WETH
      ? tickToPrice(currentTick, token0.decimals, token1.decimals)
      : 1 / tickToPrice(currentTick, token0.decimals, token1.decimals);
    
    // Estimate TVL (Total Value Locked)
    const liquidityValue = Number(liquidity);
    const sqrtPrice = Number(slot0.sqrtPriceX96) / (2**96);
    const price = sqrtPrice * sqrtPrice;
    
    // Rough estimation of liquidity in USD
    const liquidityUSD = isToken0WETH
      ? liquidityValue * currentPrice * (10 ** (stablecoin.decimals - WETH.decimals))
      : liquidityValue / currentPrice * (10 ** (stablecoin.decimals - WETH.decimals));
    
    const finalLiquidityUSD = liquidityUSD / (10 ** stablecoin.decimals);
    
    // Categorize liquidity depth
    const depthCategory = categorizeLiquidityDepth(
      finalLiquidityUSD,
      liquidityDepthData.length,
      liquidityDepthData
    );
    
    return {
      chain,
      poolAddress,
      fee,
      currentPrice,
      liquidity: liquidity.toString(),
      liquidityUSD: finalLiquidityUSD,
      liquidityDepthCategory: depthCategory,
      currentTick,
      tickSpacing,
      token0: {
        address: token0.address,
        symbol: token0.symbol,
        decimals: token0.decimals
      },
      token1: {
        address: token1.address,
        symbol: token1.symbol,
        decimals: token1.decimals
      },
      liquidityDepth: {
        activeLiquidity: liquidity.toString(),
        ticksWithLiquidity: liquidityDepthData.length,
        tickData: liquidityDepthData.map(tick => ({
          tick: tick.tick,
          price: isToken0WETH
            ? tickToPrice(tick.tick, token0.decimals, token1.decimals)
            : 1 / tickToPrice(tick.tick, token0.decimals, token1.decimals),
          liquidityGross: tick.liquidityGross,
          liquidityNet: tick.liquidityNet
        }))
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get liquidity on ${chain}: ${error.message}`);
  }
}

/**
 * Get liquidity for multiple chains
 */
export async function getETHLiquidityAllChains(fee = FEE_TIERS.MEDIUM) {
  const chains = ['base', 'arbitrum'];
  const results = await Promise.allSettled(
    chains.map(chain => getETHLiquidity(chain, fee))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        chain: chains[index],
        error: result.reason.message,
        timestamp: new Date().toISOString()
      };
    }
  });
}

/**
 * Get liquidity summary across all fee tiers
 */
export async function getETHLiquiditySummary(chain) {
  const feeTiers = Object.entries(FEE_TIERS);
  const results = [];
  
  for (const [tierName, fee] of feeTiers) {
    try {
      const liquidityData = await getETHLiquidity(chain, fee);
      results.push({
        feeTier: tierName,
        fee,
        ...liquidityData
      });
    } catch (error) {
      results.push({
        chain,
        feeTier: tierName,
        fee,
        error: error.message
      });
    }
  }
  
  return {
    chain,
    pools: results,
    timestamp: new Date().toISOString()
  };
}
