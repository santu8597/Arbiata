/**
 * /api/detect
 * 
 * Detects arbitrage opportunities by comparing prices across pools/chains
 * Returns actionable opportunities with spread calculations
 */

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getEthUsdcPrice, classifyLiquidity } from '@/lib/dex/uniswap';
import { calculateSpread, isActionableSpread } from '@/lib/math/profit';

export interface OpportunityResponse {
  success: boolean;
  timestamp: number;
  opportunity: {
    found: boolean;
    spreadPct: number;
    buyChain: 'base' | 'arbitrum';
    sellChain: 'base' | 'arbitrum';
    buyPrice: number;
    sellPrice: number;
    liquidityBuy: 'low' | 'medium' | 'high';
    liquiditySell: 'low' | 'medium' | 'high';
    actionable: boolean;
  };
  error?: string;
}

// Minimum spread to consider (0.1%)
const MIN_SPREAD_PCT = 0.1;

export async function GET(): Promise<NextResponse<OpportunityResponse>> {
  try {
    // Create providers
    const baseProvider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
    );
    const arbitrumProvider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'
    );
    
    // Fetch prices
    const [baseData, arbitrumData] = await Promise.all([
      getEthUsdcPrice(baseProvider, 'base'),
      getEthUsdcPrice(arbitrumProvider, 'arbitrum'),
    ]);
    
    const basePrice = baseData.price;
    const arbitrumPrice = arbitrumData.price;
    
    // Calculate spread
    const spreadPct = calculateSpread(basePrice, arbitrumPrice);
    const actionable = isActionableSpread(spreadPct, MIN_SPREAD_PCT);
    
    // Determine buy/sell direction
    // Buy where price is LOWER (cheaper ETH)
    // Sell where price is HIGHER (more USDC per ETH)
    const buyOnBase = basePrice < arbitrumPrice;
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      opportunity: {
        found: actionable,
        spreadPct,
        buyChain: buyOnBase ? 'base' : 'arbitrum',
        sellChain: buyOnBase ? 'arbitrum' : 'base',
        buyPrice: buyOnBase ? basePrice : arbitrumPrice,
        sellPrice: buyOnBase ? arbitrumPrice : basePrice,
        liquidityBuy: classifyLiquidity(buyOnBase ? baseData.liquidity : arbitrumData.liquidity),
        liquiditySell: classifyLiquidity(buyOnBase ? arbitrumData.liquidity : baseData.liquidity),
        actionable,
      },
    });
    
  } catch (error) {
    console.error('Detection error:', error);
    
    return NextResponse.json({
      success: false,
      timestamp: Date.now(),
      opportunity: {
        found: false,
        spreadPct: 0,
        buyChain: 'base',
        sellChain: 'arbitrum',
        buyPrice: 0,
        sellPrice: 0,
        liquidityBuy: 'low',
        liquiditySell: 'low',
        actionable: false,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
