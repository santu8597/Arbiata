import { NextRequest, NextResponse } from 'next/server';
import { getBridgingFees } from '../../../functions/bridging_fees.js';
import { getCompleteFlowGasFees } from '../../../functions/gas_fees.js';
import { getMevFees } from '../../../functions/mev_fees.js';
import { bridgeSlippage, ammSlippageETHtoUSDC } from '../../../functions/slippage_fees.js';

/**
 * POST /api/estimate
 * Calculate comprehensive cost breakdown for arbitrage simulation
 * 
 * Request body:
 * {
 *   "amount": "0.01" // ETH amount as string
 * }
 * 
 * Response: Complete simulation data structured for the dashboard UI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount } = body;

    // Validate input
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      );
    }

    const amountFloat = parseFloat(amount);

    // Fetch all fee calculations in parallel for better performance
    const [
      bridgingFeesData,
      gasFees,
      mevFees,
      bridgeSlippageData,
      ammSlippageData
    ] = await Promise.all([
      getBridgingFees(amount),
      getCompleteFlowGasFees(amount, 3000),
      getMevFees(amount),
      bridgeSlippage(amount),
      ammSlippageETHtoUSDC(amount, 3000)
    ]) as [any, any, any, any, any];

    // Debug logging
    console.log('=== Slippage Debug ===');
    console.log('Bridge Slippage Data:', JSON.stringify(bridgeSlippageData, null, 2));
    console.log('AMM Slippage Data:', JSON.stringify(ammSlippageData, null, 2));
    console.log('=====================');

    // Mock prices for demonstration (in production, fetch from price oracle)
    const ethPriceUsd = 3500;
    const buyPrice = ethPriceUsd * 0.998; // Slightly lower buy price
    const sellPrice = ethPriceUsd * 1.002; // Slightly higher sell price
    const spreadPercent = ((sellPrice - buyPrice) / buyPrice * 100);

    // Calculate total costs
    const gasCostUsd = parseFloat(gasFees.totalGasCostUsd);
    
    // Calculate slippage as percentage
    // Note: slippage functions return formatted strings like "0.350%", so we need to remove the % sign
    const bridgeSlippagePercent = parseFloat(
      typeof bridgeSlippageData.totalSlippagePercentage === 'string' 
        ? bridgeSlippageData.totalSlippagePercentage.replace('%', '')
        : bridgeSlippageData.totalSlippagePercentage || '0'
    );
    
    const ammSlippagePercent = parseFloat(
      typeof ammSlippageData.slippagePercentage === 'string'
        ? ammSlippageData.slippagePercentage.replace('%', '')
        : ammSlippageData.slippagePercentage || '0'
    );
    
    const totalSlippagePercent = bridgeSlippagePercent + ammSlippagePercent;
    
    // Calculate slippage in USD for net profit calculation
    // Bridge slippage is already in USD from the service
    const bridgeSlippageUsd = parseFloat(bridgeSlippageData.totalLossUsd || '0');
    
    // AMM slippage: slippageAmount is in USDC (output token), so it's already in USD
    const ammSlippageUsd = parseFloat(ammSlippageData.slippageAmount || '0');
    
    const slippageUsd = bridgeSlippageUsd + ammSlippageUsd;
    
    console.log('Slippage USD Calculation:', {
      bridgeSlippageUsd,
      ammSlippageUsd,
      totalSlippageUsd: slippageUsd
    });
    
    const feesUsd = parseFloat(mevFees.totalMevCostUsd);
    const bridgingFeesUsd = parseFloat(bridgingFeesData.totalFeesUsd);

    // Calculate gross profit
    const grossProfitUsd = amountFloat * (sellPrice - buyPrice);

    // Calculate net profit
    const totalCostsUsd = gasCostUsd + slippageUsd + feesUsd + bridgingFeesUsd;
    const netProfitUsd = grossProfitUsd - totalCostsUsd;

    // Calculate metrics
    const profitMarginPct = grossProfitUsd > 0 ? (netProfitUsd / grossProfitUsd) * 100 : 0;
    const roiPct = (netProfitUsd / (amountFloat * ethPriceUsd)) * 100;

    // Structure response to match dashboard UI requirements
    const response = {
      // Trading details
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      spreadPercent: spreadPercent,
      spreadPct: spreadPercent, // Alias for compatibility
      amountInEth: amountFloat,

      // Cost breakdown
      gasCostUsd: gasCostUsd,
      slippagePercent: totalSlippagePercent, // Slippage as percentage
      slippageUsd: slippageUsd, // Keep USD value for net profit calculation
      feesUsd: feesUsd, // DEX + MEV fees
      bridgingFeesUsd: bridgingFeesUsd,
      netProfitUsd: netProfitUsd,

      // Bridging details
      inputAmount: bridgingFeesData.inputAmount,
      outputAmount: bridgingFeesData.outputAmount,
      relayerFeePercentage: bridgingFeesData.relayerFee.percentage,
      relayerFeeUsd: parseFloat(bridgingFeesData.relayerFee.amountUsd),
      bridgeGasCostUsd: parseFloat(bridgingFeesData.gasCostUsd),
      estimatedTime: bridgingFeesData.estimatedTime,

      // Additional metrics
      profitMarginPct: profitMarginPct,
      roiPct: roiPct,

      // Detailed breakdown for transparency
      breakdown: {
        gas: {
          deposit: gasFees.steps.deposit,
          swap: gasFees.steps.swap,
          total: gasFees.totalGasCostUsd
        },
        bridging: {
          relayerFee: bridgingFeesData.relayerFee,
          gasCost: bridgingFeesData.gasCostUsd,
          total: bridgingFeesData.totalFeesUsd
        },
        slippage: {
          bridge: {
            amount: bridgeSlippageData.totalLossEth,
            usd: bridgeSlippageData.totalLossUsd,
            percentage: bridgeSlippageData.totalSlippagePercentage
          },
          amm: {
            amount: ammSlippageData.slippageAmount,
            percentage: ammSlippageData.slippagePercentage,
            priceImpact: ammSlippageData.priceImpactPercentage
          }
        },
        mev: {
          priorityFee: mevFees.priorityFee,
          builderTip: mevFees.builderTip,
          total: mevFees.totalMevCostUsd,
          riskLevel: mevFees.mevRiskLevel
        }
      },

      // Metadata
      timestamp: new Date().toISOString(),
      success: true
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error calculating estimate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate estimate',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/estimate
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/estimate',
    methods: ['POST'],
    description: 'Calculate comprehensive arbitrage cost estimates',
    timestamp: new Date().toISOString()
  });
}
