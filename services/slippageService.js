import { ethers } from 'ethers';
import { getProvider } from '../utils/provider.js';
import { getChainConfig } from '../config/chains.js';
import { QUOTER_ABI } from '../config/abis.js';
import { getPool } from './poolService.js';
import { tickToPrice } from './poolService.js';

/**
 * Calculate slippage for a swap from tokenIn to tokenOut
 * @param {string} chain - Chain name (e.g., 'arbitrum')
 * @param {Token} tokenIn - Input token (e.g., WETH)
 * @param {Token} tokenOut - Output token (e.g., USDC)
 * @param {string} amountIn - Amount to swap (in token units, e.g., "1" for 1 ETH)
 * @param {number} fee - Fee tier (e.g., 500, 3000, 10000)
 * @returns {Object} Slippage calculation results
 */
export async function calculateSlippage(chain, tokenIn, tokenOut, amountIn, fee) {
  try {
    const provider = getProvider(chain);
    const config = getChainConfig(chain);
    
    // Convert amount to wei/smallest unit
    const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
    
    // Get current pool state
    const { pool, poolAddress, slot0 } = await getPool(chain, tokenIn, tokenOut, fee);
    
    // Calculate expected output based on current price (no slippage)
    const token0 = pool.token0;
    const token1 = pool.token1;
    const currentTick = Number(slot0.tick);
    
    // Determine token order and calculate price
    const isToken0Input = token0.address.toLowerCase() === tokenIn.address.toLowerCase();
    
    let priceRatio;
    if (isToken0Input) {
      // token0 -> token1
      priceRatio = tickToPrice(currentTick, token0.decimals, token1.decimals);
    } else {
      // token1 -> token0
      priceRatio = 1 / tickToPrice(currentTick, token0.decimals, token1.decimals);
    }
    
    // Expected output without price impact (ideal case)
    const expectedAmountOut = parseFloat(amountIn) * priceRatio;
    
    // Use Quoter V2 to simulate the actual swap
    const quoter = new ethers.Contract(config.quoter, QUOTER_ABI, provider);
    
    // Quote parameters for Quoter V2
    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: amountInWei,
      fee: fee,
      sqrtPriceLimitX96: 0 // No price limit
    };
    
    // Call quoteExactInputSingle (it's a view function but may need callStatic)
    let quoteResult;
    try {
      quoteResult = await quoter.quoteExactInputSingle.staticCall(params);
    } catch (error) {
      // Fallback: try without .staticCall for older ethers versions
      quoteResult = await quoter.callStatic.quoteExactInputSingle(params);
    }
    
    // Parse actual amount out from quote
    const actualAmountOut = parseFloat(ethers.formatUnits(quoteResult.amountOut || quoteResult[0], tokenOut.decimals));
    
    // Calculate slippage percentage
    const slippageAmount = expectedAmountOut - actualAmountOut;
    const slippagePercentage = (slippageAmount / expectedAmountOut) * 100;
    
    // Calculate price impact
    const executionPrice = actualAmountOut / parseFloat(amountIn);
    const priceImpact = ((priceRatio - executionPrice) / priceRatio) * 100;
    
    return {
      chain,
      poolAddress,
      tokenIn: {
        symbol: tokenIn.symbol,
        address: tokenIn.address,
        amount: amountIn
      },
      tokenOut: {
        symbol: tokenOut.symbol,
        address: tokenOut.address
      },
      fee: fee,
      feeTier: `${fee / 10000}%`,
      currentPrice: priceRatio,
      expectedAmountOut: expectedAmountOut,
      actualAmountOut: actualAmountOut,
      slippage: {
        amount: slippageAmount,
        percentage: slippagePercentage,
        formatted: `${slippagePercentage.toFixed(4)}%`
      },
      priceImpact: {
        percentage: priceImpact,
        formatted: `${priceImpact.toFixed(4)}%`
      },
      executionPrice: executionPrice,
      currentTick: currentTick,
      liquidity: typeof pool.liquidity === 'object' && pool.liquidity.toString ? pool.liquidity.toString() : String(pool.liquidity),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating slippage:', error);
    throw error;
  }
}

/**
 * Calculate slippage for ETH to USDC on Arbitrum (convenience function)
 * @param {string} ethAmount - Amount of ETH to swap (e.g., "1", "0.5")
 * @param {number} fee - Optional fee tier (default: 500 for 0.05%)
 * @returns {Object} Slippage calculation results
 */
export async function calculateETHtoUSDCSlippage(ethAmount, fee = 500) {
  const config = getChainConfig('arbitrum');
  const { WETH, USDC } = config.tokens;
  
  return calculateSlippage('arbitrum', WETH, USDC, ethAmount, fee);
}

/**
 * Calculate slippage across all available fee tiers
 * @param {string} chain - Chain name
 * @param {Token} tokenIn - Input token
 * @param {Token} tokenOut - Output token
 * @param {string} amountIn - Amount to swap
 * @returns {Array} Array of slippage results for each fee tier
 */
export async function calculateSlippageAllPools(chain, tokenIn, tokenOut, amountIn) {
  const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  const results = [];
  
  for (const fee of feeTiers) {
    try {
      const result = await calculateSlippage(chain, tokenIn, tokenOut, amountIn, fee);
      results.push(result);
    } catch (error) {
      console.error(`Failed to calculate slippage for fee tier ${fee}:`, error.message);
      // Continue with next fee tier
    }
  }
  
  // Sort by best execution (lowest slippage)
  results.sort((a, b) => a.slippage.percentage - b.slippage.percentage);
  
  return results;
}
