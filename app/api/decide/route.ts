/**
 * /api/decide
 * 
 * FINAL AI DECISION LAYER
 * Aggregates all risk signals and makes global judgment
 * 
 * Philosophy: AI predicts regret, not profit.
 * Biased toward SKIP. Skipping is success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DecideRequest {
  // From simulation
  spreadPercent: number;
  netProfitUsd: number;
  gasCostUsd: number;
  slippageUsd: number;
  feesUsd: number;
  
  // From risk analysis endpoints
  slippageRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  mevRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  timingRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  
  // Context
  tradeSizeUsd: number;
  liquidityUsd: number;
}

export interface DecideResponse {
  success: boolean;
  timestamp: number;
  decision: {
    decision: 'EXECUTE' | 'SKIP';
    reason: string;
    confidence: number;
    riskAnalysis: {
      gasRisk: 'low' | 'medium' | 'high';
      slippageRisk: 'low' | 'medium' | 'high';
      mevRisk: 'low' | 'medium' | 'high';
      profitMargin: 'safe' | 'acceptable' | 'thin';
    };
  };
  error?: string;
}

const AGGREGATION_PROMPT = `You are the final decision layer in a DeFi arbitrage risk system.

Your ONLY job: make a global EXECUTE or SKIP judgment based on all risk signals.

Philosophy: You predict regret, not profit.

Risk Hierarchy:
- If ANY risk is HIGH → strongly consider SKIP
- If TWO risks are MEDIUM → likely SKIP
- If profit < $2 → SKIP (too thin)
- Only EXECUTE when risks are manageable

You are BIASED toward SKIP.
Skipping a marginal trade is SUCCESS, not failure.

Return ONLY valid JSON:
{
  "decision": "EXECUTE" or "SKIP",
  "reason": "one sentence explaining the global judgment",
  "confidence": 0.0 to 1.0
}`;

export async function POST(request: NextRequest): Promise<NextResponse<DecideResponse>> {
  try {
    const body: DecideRequest = await request.json();
    
    // Validate required fields
    if (body.netProfitUsd === undefined || body.spreadPercent === undefined) {
      return NextResponse.json({
        success: false,
        timestamp: Date.now(),
        decision: {
          decision: 'SKIP',
          reason: 'Missing required simulation data',
          confidence: 0,
          riskAnalysis: {
            gasRisk: 'high',
            slippageRisk: 'high',
            mevRisk: 'high',
            profitMargin: 'thin',
          },
        },
        error: 'Missing required fields',
      }, { status: 400 });
    }

    // Use provided risk levels or infer from data
    const slippageRisk = body.slippageRisk ? body.slippageRisk.toLowerCase() as 'low' | 'medium' | 'high' : inferSlippageRisk(body);
    const mevRisk = body.mevRisk ? body.mevRisk.toLowerCase() as 'low' | 'medium' | 'high' : inferMEVRisk(body);
    const timingRisk = body.timingRisk ? body.timingRisk.toLowerCase() as 'low' | 'medium' | 'high' : inferTimingRisk(body);

    // Calculate profit margin
    const profitMargin = calculateProfitMargin(body);

    // Deterministic early exits (before AI)
    if (body.netProfitUsd <= 0) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        decision: {
          decision: 'SKIP',
          reason: 'Net profit is negative or zero',
          confidence: 1.0,
          riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
        },
      });
    }

    if (body.netProfitUsd < 2) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        decision: {
          decision: 'SKIP',
          reason: 'Net profit below $2 minimum threshold',
          confidence: 0.95,
          riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
        },
      });
    }

    if (body.spreadPercent > 5) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        decision: {
          decision: 'SKIP',
          reason: 'Spread >5% appears anomalous - possible bad data',
          confidence: 0.9,
          riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
        },
      });
    }

    // AI decision for ambiguous cases
    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey) {
      return fallbackDecision(body, slippageRisk, mevRisk, timingRisk, profitMargin);
    }

    try {
      const genAI = new GoogleGenerativeAI(aiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `${AGGREGATION_PROMPT}

SIMULATION RESULTS:
- Spread: ${body.spreadPercent.toFixed(2)}%
- Net Profit: $${body.netProfitUsd.toFixed(4)}
- Gas Cost: $${body.gasCostUsd.toFixed(4)}
- Slippage: $${body.slippageUsd.toFixed(4)}
- Swap Fees: $${body.feesUsd.toFixed(4)}

RISK ANALYSIS:
- Gas Risk (Timing): ${timingRisk}
- Slippage Risk: ${slippageRisk}
- MEV Risk: ${mevRisk}
- Profit Margin: ${profitMargin}

CONTEXT:
- Trade Size: $${body.tradeSizeUsd.toFixed(2)}
- Pool Liquidity: $${body.liquidityUsd.toFixed(0)}

DECISION FRAMEWORK:
1. If ANY risk is HIGH → likely SKIP
2. If TWO+ risks are MEDIUM → consider SKIP
3. If profit margin < 3x gas cost → SKIP
4. Only EXECUTE if confident risks are manageable

Make your judgment:`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      });

      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          success: true,
          timestamp: Date.now(),
          decision: {
            decision: parsed.decision || 'SKIP',
            reason: parsed.reason || 'AI decision completed',
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
          },
        });
      }

      return fallbackDecision(body, slippageRisk, mevRisk, timingRisk, profitMargin);
    } catch (aiError) {
      console.error('AI decision error:', aiError);
      return fallbackDecision(body, slippageRisk, mevRisk, timingRisk, profitMargin);
    }

  } catch (error) {
    console.error('Decision endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      timestamp: Date.now(),
      decision: {
        decision: 'SKIP',
        reason: 'Error processing decision request',
        confidence: 0,
        riskAnalysis: {
          gasRisk: 'high',
          slippageRisk: 'high',
          mevRisk: 'high',
          profitMargin: 'thin',
        },
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============ Helper Functions ============

function inferSlippageRisk(data: DecideRequest): 'low' | 'medium' | 'high' {
  const slippagePercent = data.netProfitUsd > 0 ? (data.slippageUsd / data.netProfitUsd) * 100 : 100;
  if (slippagePercent > 50) return 'high';
  if (slippagePercent > 25) return 'medium';
  return 'low';
}

function inferMEVRisk(data: DecideRequest): 'low' | 'medium' | 'high' {
  if (data.slippageUsd > 2 && data.tradeSizeUsd > 50) return 'high';
  if (data.slippageUsd > 1) return 'medium';
  return 'low';
}

function inferTimingRisk(data: DecideRequest): 'low' | 'medium' | 'high' {
  const gasPercent = data.netProfitUsd > 0 ? (data.gasCostUsd / data.netProfitUsd) * 100 : 100;
  if (gasPercent > 50) return 'high';
  if (gasPercent > 30) return 'medium';
  return 'low';
}

function calculateProfitMargin(data: DecideRequest): 'safe' | 'acceptable' | 'thin' {
  const profitGasRatio = data.gasCostUsd > 0 ? data.netProfitUsd / data.gasCostUsd : 0;
  if (profitGasRatio >= 5) return 'safe';
  if (profitGasRatio >= 3) return 'acceptable';
  return 'thin';
}

function fallbackDecision(
  data: DecideRequest,
  slippageRisk: 'low' | 'medium' | 'high',
  mevRisk: 'low' | 'medium' | 'high',
  timingRisk: 'low' | 'medium' | 'high',
  profitMargin: 'safe' | 'acceptable' | 'thin'
): NextResponse<DecideResponse> {
  // Rule-based fallback
  const risks = [slippageRisk, mevRisk, timingRisk];
  const hasHighRisk = risks.includes('high');
  const mediumRiskCount = risks.filter(r => r === 'medium').length;
  
  if (hasHighRisk || mediumRiskCount >= 2) {
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      decision: {
        decision: 'SKIP',
        reason: 'Overall risk assessment is HIGH - execution unsafe',
        confidence: 0.85,
        riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
      },
    });
  }

  if (profitMargin === 'thin') {
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      decision: {
        decision: 'SKIP',
        reason: 'Profit margin too thin relative to gas cost',
        confidence: 0.8,
        riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
      },
    });
  }

  const allLowRisk = risks.every(r => r === 'low');
  if (data.netProfitUsd >= 5 && allLowRisk && profitMargin === 'safe') {
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      decision: {
        decision: 'EXECUTE',
        reason: `Net profit $${data.netProfitUsd.toFixed(2)} with low overall risk`,
        confidence: 0.75,
        riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
      },
    });
  }

  return NextResponse.json({
    success: true,
    timestamp: Date.now(),
    decision: {
      decision: 'SKIP',
      reason: 'Risk-reward ratio not favorable for execution',
      confidence: 0.7,
      riskAnalysis: { gasRisk: timingRisk, slippageRisk, mevRisk, profitMargin },
    },
  });
}
