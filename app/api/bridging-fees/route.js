import { NextResponse } from 'next/server';
import { getBridgingFees } from '@/functions/bridging_fees';

/**
 * POST /api/bridging-fees
 * Calculate bridging fees for a given ETH amount
 * 
 * Request body:
 * {
 *   "amount": "0.01" // Amount in ETH
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "bridgingFees": {
 *     "protocol": "Across Protocol",
 *     "bridge": "Base → Arbitrum",
 *     "inputAmount": "0.01",
 *     "outputAmount": "0.009XXX",
 *     "relayerFee": {
 *       "percentage": "0.05%",
 *       "amountEth": 0.000005,
 *       "amountUsd": 0.01
 *     },
 *     "gasCostEth": 0.0001,
 *     "gasCostUsd": 0.20,
 *     "gasPrice": "5.5 Gwei",
 *     "totalFeesEth": 0.000105,
 *     "totalFeesUsd": 0.21,
 *     "estimatedTime": "1-3 minutes",
 *     "timestamp": "2025-01-..."
 *   }
 * }
 */
export async function POST(request) {
  try {
    const { amount } = await request.json();

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

    // Calculate bridging fees
    const bridgingFees = await getBridgingFees(amount);

    return NextResponse.json({
      success: true,
      bridgingFees
    });

  } catch (error) {
    console.error('❌ Bridging fees calculation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to calculate bridging fees' 
      },
      { status: 500 }
    );
  }
}
