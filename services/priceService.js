import { getAllPools, tickToPrice } from './poolService.js';
import { getChainConfig } from '../config/chains.js';
import { getProvider } from '../utils/provider.js';

/**
 * Get ETH price in USD from WETH/USDC pool
 */
export async function getETHPrice(chain) {
  try {
    console.log(`[${new Date().toISOString()}] Fetching fresh ETH price for ${chain}...`);
    const config = getChainConfig(chain);
    const { WETH, USDC, USDbC } = config.tokens;
    
    let poolAddress, pool, slot0, liquidity, fee;
    
    // Use specific pool for Base mainnet
    if (chain.toLowerCase() === 'base') {
      poolAddress = '0x6c561B446416E1A00E8E93E221854d6eA4171372';
      const provider = getProvider(chain);
      const { ethers } = await import('ethers');
      const { POOL_ABI } = await import('../config/abis.js');
      const { Pool } = await import('@uniswap/v3-sdk');
      const JSBI = (await import('jsbi')).default;
      
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
      
      // Fetch pool state
      [slot0, liquidity, fee] = await Promise.all([
        poolContract.slot0(),
        poolContract.liquidity(),
        poolContract.fee()
      ]);
      
      // Get token order from pool
      const [token0Address, token1Address] = await Promise.all([
        poolContract.token0(),
        poolContract.token1()
      ]);
      
      // Determine token order (WETH/USDC)
      const token0 = token0Address.toLowerCase() === WETH.address.toLowerCase() ? WETH : USDC;
      const token1 = token0Address.toLowerCase() === WETH.address.toLowerCase() ? USDC : WETH;
      
      // Create pool instance
      pool = new Pool(
        token0,
        token1,
        Number(fee),
        JSBI.BigInt(slot0.sqrtPriceX96.toString()),
        JSBI.BigInt(liquidity.toString()),
        Number(slot0.tick)
      );
    } else {
      // For other chains, find the most liquid pool
      let pools = await getAllPools(chain, WETH, USDC);
      
      // If no USDC pools found and USDbC exists, try USDbC
      if (pools.length === 0 && USDbC) {
        pools = await getAllPools(chain, WETH, USDbC);
      }
      
      if (pools.length === 0) {
        throw new Error(`No WETH/USDC or WETH/USDbC pools found on ${chain}`);
      }
      
      // Sort by liquidity and get the most liquid pool
      pools.sort((a, b) => {
        const liquidityA = BigInt(a.liquidity);
        const liquidityB = BigInt(b.liquidity);
        return liquidityB > liquidityA ? 1 : -1;
      });
      
      const mostLiquidPool = pools[0];
      ({ pool, slot0, liquidity, poolAddress, fee } = mostLiquidPool);
    }
    
    // Calculate price
    const token0 = pool.token0;
    const token1 = pool.token1;
    const currentTick = Number(slot0.tick);
    
    // Determine which token is WETH
    const isToken0WETH = token0.address.toLowerCase() === WETH.address.toLowerCase();
    
    let ethPriceUSD;
    if (isToken0WETH) {
      // WETH is token0, price is in terms of token1 (USDC)
      ethPriceUSD = tickToPrice(currentTick, token0.decimals, token1.decimals);
    } else {
      // WETH is token1, need to invert
      ethPriceUSD = 1 / tickToPrice(currentTick, token0.decimals, token1.decimals);
    }
    
    return {
      chain,
      price: ethPriceUSD,
      poolAddress,
      liquidity: liquidity.toString(),
      tick: currentTick,
      fee: Number(fee),
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
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
      timestamp: new Date().toISOString(),
      note: "Real-time price from blockchain - refreshes on every API call"
    };
  } catch (error) {
    throw new Error(`Failed to get ETH price on ${chain}: ${error.message}`);
  }
}

/**
 * Get prices for multiple chains
 */
export async function getETHPricesAllChains() {
  const chains = ['base', 'arbitrum'];
  const results = await Promise.allSettled(
    chains.map(chain => getETHPrice(chain))
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
