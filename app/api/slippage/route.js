import { NextResponse } from 'next/server';
import { bridgeSlippage, ammSlippage } from '@/functions/slippage_fees';

/**
 * POST /api/slippage
 * Calculate slippage for bridging and/or AMM swap
 * 
 * Request body:
 * {
 *   "type": "bridge" | "amm" | "both",  // Type of slippage to calculate
 *   "amount": "0.01"                     // Amount in ETH
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "bridgeSlippage": { ... },  // Included if type is "bridge" or "both"
 *   "ammSlippage": { ... }      // Included if type is "amm" or "both"
 * }
 */
export async function POST(request) {
  try {
    const { type = 'both', amount } = await request.json();

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid amount. Must be a positive number.' 
        },
        { status: 400 }
      );
    }

    // Validate type
    if (!['bridge', 'amm', 'both'].includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid type. Must be "bridge", "amm", or "both".' 
        },
        { status: 400 }
      );
    }

    const result = { success: true };

    // Calculate requested slippage types
    if (type === 'bridge' || type === 'both') {
      const bridgeSlippageData = await bridgeSlippage(amount);
      result.bridgeSlippage = bridgeSlippageData;
    }

    if (type === 'amm' || type === 'both') {
      const ammSlippageData = await ammSlippage(amount);
      result.ammSlippage = ammSlippageData;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Slippage calculation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to calculate slippage' 
      },
      { status: 500 }
    );
  }
}
