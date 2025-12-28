/**
 * /api/prices
 * 
 * Fetches ETH/USDC prices from Uniswap V3 pools
 * Read-only, no gas cost
 */

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getEthUsdcPrice, classifyLiquidity, ADDRESSES } from '@/lib/dex/uniswap';

export interface PriceResponse {
  success: boolean;
  timestamp: number;
  prices: {
    base: {
      price: number;
      liquidity: string;
      liquidityDepth: 'low' | 'medium' | 'high';
      pool: string;
    };
    arbitrum: {
      price: number;
      liquidity: string;
      liquidityDepth: 'low' | 'medium' | 'high';
      pool: string;
    };
  };
  error?: string;
}

export async function GET(): Promise<NextResponse<PriceResponse>> {
  try {
    // Create providers for both TESTNET chains
    const baseProvider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
    );
    const arbitrumProvider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'
    );
    
    // Fetch prices in parallel
    const [basePrice, arbitrumPrice] = await Promise.all([
      getEthUsdcPrice(baseProvider, 'base'),
      getEthUsdcPrice(arbitrumProvider, 'arbitrum'),
    ]);
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      prices: {
        base: {
          price: basePrice.price,
          liquidity: basePrice.liquidity.toString(),
          liquidityDepth: classifyLiquidity(basePrice.liquidity),
          pool: ADDRESSES.base.ethUsdcPool,
        },
        arbitrum: {
          price: arbitrumPrice.price,
          liquidity: arbitrumPrice.liquidity.toString(),
          liquidityDepth: classifyLiquidity(arbitrumPrice.liquidity),
          pool: ADDRESSES.arbitrum.ethUsdcPool,
        },
      },
    });
    
  } catch (error) {
    console.error('Price fetch error:', error);
    
    return NextResponse.json({
      success: false,
      timestamp: Date.now(),
      prices: {
        base: { price: 0, liquidity: '0', liquidityDepth: 'low', pool: '' },
        arbitrum: { price: 0, liquidity: '0', liquidityDepth: 'low', pool: '' },
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
