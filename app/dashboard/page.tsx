'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { User } from 'lucide-react';
import {
  useUserBalance,
  useDeposit,
  useWithdraw,
  useExecuteArb,
  useCorrectNetwork,
  useContractConfigured
} from '@/lib/hooks/useContract';
// import { CONTRACT_ADDRESS } from '@/lib/contract-abi';
import { CandlestickChart } from '@/components/CandlestickChart';
import Hyperspeed from '@/components/Hyperspeed';
import { ShinyButton } from '@/components/ui/shiny-button';
// import { OrderBook } from '@/components/OrderBook';
// import { TradeHistory } from '@/components/TradeHistory';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { isCorrectNetwork } = useCorrectNetwork();
  const { isConfigured } = useContractConfigured();

  // Wallet balance
  const { data: walletBalanceData } = useBalance({ address });

  // Contract hooks
  const { balance, refetch: refetchBalance } = useUserBalance();
  const {
    writeDeposit,
    isPending: isDepositing,
    isConfirming: isDepositConfirming,
    isSuccess: depositSuccess,
    error: depositError
  } = useDeposit();

  const {
    writeWithdraw,
    isPending: isWithdrawing,
    isConfirming: isWithdrawConfirming,
    isSuccess: withdrawSuccess,
    error: withdrawError
  } = useWithdraw();

  const {
    writeExecuteArb,
    isPending: isExecuting,
    isConfirming: isExecuteConfirming,
    isSuccess: executeSuccess,
    data: executeTxHash,
    error: executeError
  } = useExecuteArb();

  // State
  const [prices, setPrices] = useState<any>(null);
  const [opportunity, setOpportunity] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [decision, setDecision] = useState<any>(null);
  const [calculation, setCalculation] = useState<any>(null);
  const [depositAmountUsd, setDepositAmountUsd] = useState('10');
  const [tradeAmount, setTradeAmount] = useState('0.01');
  const [withdrawAmount, setWithdrawAmount] = useState('0.01');
  const [error, setError] = useState<string>('');
  const [showSimulationCards, setShowSimulationCards] = useState(true);
  const [depositWithdrawMode, setDepositWithdrawMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [loading, setLoading] = useState({
    prices: false,
    simulation: false,
    decision: false,
  });

  // Live prices from candlestick chart
  const [liveBasePrice, setLiveBasePrice] = useState<number>(2925);
  const [liveArbitrumPrice, setLiveArbitrumPrice] = useState<number>(2925);

  // Callback to receive price updates from CandlestickChart
  const handlePriceUpdate = (basePrice: number, arbitrumPrice: number) => {
    setLiveBasePrice(basePrice);
    setLiveArbitrumPrice(arbitrumPrice);
  };

  // Calculations
  const balanceFormatted = balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';
  const walletBalanceFormatted = walletBalanceData?.value
    ? parseFloat(formatEther(walletBalanceData.value)).toFixed(4)
    : '0.0000';

  const ethPriceUsd = prices?.base?.price || 2000;
  const depositAmountEth = (parseFloat(depositAmountUsd) / ethPriceUsd).toFixed(6);
  const hasMinimumDeposit = balance && balance > 0n;

  // Debug log
  useEffect(() => {
    if (balance) {
      console.log('Contract balance:', formatEther(balance), 'ETH');
      console.log('Has minimum deposit:', hasMinimumDeposit);
    }
  }, [balance, hasMinimumDeposit]);

  // Refetch balance after successful deposit or withdrawal
  useEffect(() => {
    if (depositSuccess || withdrawSuccess) {
      // Wait a bit for blockchain to update, then refetch
      const timer = setTimeout(() => {
        refetchBalance();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [depositSuccess, withdrawSuccess, refetchBalance]);

  // Fetch real-time prices using Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const connectToStream = () => {
      try {
        eventSource = new EventSource('/api/prices-stream');
        
        eventSource.addEventListener('price-update', (e) => {
          const data = JSON.parse(e.data);
          if (data.success) {
            setPrices({
              base: data.prices.base,
              arbitrum: data.prices.arbitrum,
              spread: data.spread,
              warning: data.warning,
            });
            setLoading(l => ({ ...l, prices: false }));
            console.log('📡 Real-time price update received:', {
              base: data.prices.base.price.toFixed(2),
              arb: data.prices.arbitrum.price.toFixed(2),
              spread: data.spread.percentage.toFixed(3) + '%'
            });
          }
        });

        eventSource.addEventListener('error', (error) => {
          console.warn('❌ SSE connection error, falling back to polling:', error);
          eventSource?.close();
          
          // Fallback to polling if SSE fails
          if (!fallbackInterval) {
            startPolling();
          }
        });

        eventSource.onerror = () => {
          console.warn('❌ SSE connection lost, will retry...');
          eventSource?.close();
          setTimeout(connectToStream, 5000); // Retry after 5 seconds
        };

        console.log('✅ Connected to real-time price stream');
      } catch (error) {
        console.error('Failed to connect to SSE:', error);
        startPolling();
      }
    };

    const startPolling = () => {
      const fetchPrices = async () => {
        setLoading(l => ({ ...l, prices: true }));
        try {
          const res = await fetch('/api/prices-live');
          const data = await res.json();
          if (data.success) {
            setPrices({
              base: data.prices.base,
              arbitrum: data.prices.arbitrum,
              spread: data.spread,
              warning: data.warning,
            });
          }
        } catch (err) {
          console.error('Price fetch error:', err);
        } finally {
          setLoading(l => ({ ...l, prices: false }));
        }
      };

      fetchPrices();
      fallbackInterval = setInterval(fetchPrices, 10000);
    };

    // Start with SSE, fallback to polling if it fails
    connectToStream();

    return () => {
      eventSource?.close();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, []);

  // Fetch opportunity


  // Handlers
  const handleDeposit = () => {
    if (!depositAmountUsd || parseFloat(depositAmountUsd) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }
    try {
      setError('');
      const value = parseEther(depositAmountEth);
      writeDeposit({ value });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Note: Removed auto-simulation to give user control
  // User will manually click "Run Simulation" when ready

  const runSimulation = async () => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
      setError('Please enter a valid trade amount');
      return;
    }

    setShowSimulationCards(false);
    setLoading(l => ({ ...l, simulation: true }));
    try {
      // Call the comprehensive estimate API
      const estimateRes = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: tradeAmount }),
      });
      const estimateData = await estimateRes.json();

      if (estimateData.success) {
        // Map the API response to simulation state
        const simulationData = {
          // Trading details
          buyPrice: estimateData.buyPrice,
          sellPrice: estimateData.sellPrice,
          spreadPercent: estimateData.spreadPercent,
          spreadPct: estimateData.spreadPct,
          amountInEth: estimateData.amountInEth,
          
          // Cost breakdown
          gasCostUsd: estimateData.gasCostUsd,
          slippageUsd: estimateData.slippageUsd,
          feesUsd: estimateData.feesUsd,
          bridgingFeesUsd: estimateData.bridgingFeesUsd,
          netProfitUsd: estimateData.netProfitUsd,
          
          // Bridging details
          inputAmount: estimateData.inputAmount,
          outputAmount: estimateData.outputAmount,
          relayerFeePercentage: estimateData.relayerFeePercentage,
          relayerFeeUsd: estimateData.relayerFeeUsd,
          bridgeGasCostUsd: estimateData.bridgeGasCostUsd,
          estimatedTime: estimateData.estimatedTime,
          
          // Additional metrics
          profitMarginPct: estimateData.profitMarginPct,
          roiPct: estimateData.roiPct,
          
          // Detailed breakdown (optional, for debugging)
          breakdown: estimateData.breakdown
        };

        setSimulation(simulationData);
        setError('');
      } else {
        setError(estimateData.error || 'Failed to calculate estimate');
      }
    } catch (err: any) {
      console.error('Estimate calculation error:', err);
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(l => ({ ...l, simulation: false }));
    }
  };

  const handleExecute = () => {
    try {
      setError('');
      const amountIn = parseEther(tradeAmount);
      // Set minProfit to 0 for now (let AI decide via simulation)
      // In production, could calculate from simulation.netProfitUsd
      const minProfit = parseEther('0');
      writeExecuteArb({ args: [amountIn, minProfit] });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleWithdraw = () => {
    try {
      setError('');
      const value = parseEther(withdrawAmount);
      writeWithdraw({ args: [value] });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl">Please connect your wallet</h2>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white font-light relative overflow-hidden">
      {/* Hyperspeed Background Animation */}
      <div className="absolute inset-0 opacity-30 z-0">
        <Hyperspeed 
          length={400}
          roadWidth={9}
          islandWidth={2}
          lanesPerRoad={3}
          fov={90}
          fovSpeedUp={150}
          speedUp={2}
          carLightsFade={0.4}
          totalSideLightSticks={50}
          lightPairsPerRoadWay={50}
        />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10">
        <div className="px-4 py-8 space-y-6">

        {/* Trading Interface - Chart + Price Cards + Right Panel */}
        {isConnected && (
          <div className="flex flex-col lg:flex-row gap-8 mb-6">
            {/* Main Chart - Left side (reduced size) */}
            <div className="w-full lg:w-2/3 max-w-4xl">
              <div className="glass-dark rounded-2xl p-6 shadow-2xl">
                <CandlestickChart 
                  prices={prices}
                  loading={loading.prices}
                  onPriceUpdate={handlePriceUpdate}
                />
              </div>
            </div>
            
            {/* Right side container */}
            <div className="w-full flex flex-col gap-6">
              {/* Top row: Price Cards and Deposit (side by side) */}
              <div className="flex gap-4">
                {/* Price Cards */}
                {prices && (
                  <div className="w-1/2">
                    <div className="glass-medium rounded-2xl p-4 shadow-2xl h-full">
                      <h3 className="text-xs uppercase tracking-widest text-zinc-400 mb-4 text-center font-extralight">Live Prices</h3>
                      <div className="space-y-2">
                        <div className="text-center p-2 glass-light-shimmer rounded-xl">
                          <div className="text-xs text-teal-400 uppercase mb-1 font-light">Base</div>
                          <div className="text-sm font-light font-mono text-teal-300">
                            ${liveBasePrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center p-2 glass-light-shimmer rounded-xl">
                          <div className="text-xs text-yellow-400 uppercase mb-1 font-light">Arbitrum</div>
                          <div className="text-sm font-light font-mono text-yellow-300">
                            ${liveArbitrumPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center p-2 glass-light-shimmer rounded-xl">
                          <div className="text-xs text-pink-400 uppercase mb-1 font-light">Spread</div>
                          <div className="text-sm font-light font-mono text-pink-300">
                            {(((liveArbitrumPrice - liveBasePrice) / liveBasePrice) * 100).toFixed(3)}%
                          </div>
                        </div>
                      </div>
                      {prices.warning && (
                        <div className="mt-3 text-center">
                          
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Deposit/Withdraw Panel */}
                {isCorrectNetwork && (
                  <div className="w-1/2">
                    <div className="glass-medium rounded-2xl p-4 shadow-2xl h-full">
                      {/* Toggle Buttons */}
                      <div className="flex mb-4 p-1 glass-dark rounded-xl">
                        <button
                          onClick={() => setDepositWithdrawMode('deposit')}
                          className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
                            depositWithdrawMode === 'deposit'
                              ? 'btn-shiny-accent'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Deposit
                        </button>
                        <button
                          onClick={() => setDepositWithdrawMode('withdraw')}
                          className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
                            depositWithdrawMode === 'withdraw'
                              ? 'btn-shiny-red'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Withdraw
                        </button>
                      </div>

                      {depositWithdrawMode === 'deposit' ? (
                        /* Deposit Section */
                        <>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-zinc-400 uppercase mb-2 font-light tracking-wider">Amount (USD)</label>
                              <input
                                type="number"
                                value={depositAmountUsd}
                                onChange={(e) => setDepositAmountUsd(e.target.value)}
                                className="w-full glass-light rounded-xl px-3 py-2 text-sm font-light focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                min="1"
                                step="1"
                              />
                              <div className="text-xs text-zinc-500 mt-1 font-light">
                                ≈ {depositAmountEth} ETH
                              </div>
                            </div>
                            <button
                              onClick={handleDeposit}
                              disabled={isDepositing || isDepositConfirming || parseFloat(depositAmountUsd) < 1}
                              className="w-full px-3 py-2 rounded-xl btn-shiny-accent font-medium text-xs"
                            >
                              {isDepositing ? 'Confirm...' : isDepositConfirming ? 'Confirming...' : `Deposit $${depositAmountUsd}`}
                            </button>
                          </div>

                          {depositError && (
                            <div className="mt-3 p-2 rounded-xl glass-dark border border-red-500/30 text-red-400 text-xs font-light">
                              {depositError.message}
                            </div>
                          )}
                          {depositSuccess && (
                            <div className="mt-3 p-2 rounded-xl glass-dark border border-teal-500/30 text-teal-400 text-xs font-light">
                              ✓ Deposit successful!
                            </div>
                          )}
                        </>
                      ) : (
                        /* Withdraw Section */
                        <>
                          <div className="mb-3">
                            <h3 className="text-sm font-light mb-1 text-zinc-200">Withdraw Funds</h3>
                            <p className="text-zinc-400 text-xs font-light">Withdraw ETH from account</p>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-zinc-400 uppercase mb-2 font-light tracking-wider">Amount (ETH)</label>
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full glass-light rounded-xl px-3 py-2 text-sm font-light focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                min="0.001"
                                max={balanceFormatted}
                                step="0.001"
                              />
                              <div className="text-xs text-zinc-500 mt-1 font-light">
                                Available: {balanceFormatted} ETH
                              </div>
                            </div>
                            <button
                              onClick={handleWithdraw}
                              disabled={isWithdrawing || isWithdrawConfirming}
                              className="w-full px-3 py-2 rounded-xl btn-shiny-red font-medium text-xs"
                            >
                              {isWithdrawing ? 'Confirm...' : isWithdrawConfirming ? 'Processing...' : `Withdraw ${withdrawAmount} ETH`}
                            </button>
                          </div>

                          {withdrawError && (
                            <div className="mt-3 p-2 rounded-xl glass-dark border border-red-500/30 text-red-400 text-xs font-light">
                              {withdrawError.message}
                            </div>
                          )}
                          {withdrawSuccess && (
                            <div className="mt-3 p-2 rounded-xl glass-dark border border-teal-500/30 text-teal-400 text-xs font-light">
                              ✓ Withdrawal successful!
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bottom row: Simulation Panel (full width) */}
              {isCorrectNetwork && (
                <div className="glass-medium rounded-2xl p-4 shadow-2xl">
                  <div className="mb-4">
                    <h3 className="text-base font-light mb-1 text-zinc-200">Estimate</h3>
                    <p className="text-zinc-400 text-xs font-light">Test arbitrage strategy</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase mb-2 font-light tracking-wider">Trade Amount (ETH)</label>
                      <input
                        type="number"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="w-full glass-light rounded-xl px-3 py-2 text-sm font-light focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                        min="0.001"
                        max={balanceFormatted}
                        step="0.001"
                      />
                      <div className="text-xs text-zinc-500 mt-1 font-light">
                        Available: {balanceFormatted} ETH
                      </div>
                    </div>
                    <ShinyButton
                      onClick={runSimulation}
                      disabled={loading.simulation}
                      className="w-full"
                      variant="primary"
                    >
                      {loading.simulation ? 'Estimating...' : 'Estimate'}
                    </ShinyButton>
                  </div>

                  {/* Show cards initially, simulation results after running */}
                  {showSimulationCards && !simulation && !loading.simulation ? (
                    <>
                      {/* Four Information Cards - Minimalistic */}
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="glass-light-shimmer rounded-xl p-3">
                          <div className="text-xs text-zinc-300 uppercase font-light mb-1 tracking-wider">Gas</div>
                          <div className="text-xs text-zinc-400 font-light">Real-time costs</div>
                        </div>
                        
                        <div className="glass-light-shimmer rounded-xl p-3">
                          <div className="text-xs text-zinc-300 uppercase font-light mb-1 tracking-wider">MEV</div>
                          <div className="text-xs text-zinc-400 font-light">ransaction extraction</div>
                        </div>
                        
                        <div className="glass-light-shimmer rounded-xl p-3">
                          <div className="text-xs text-zinc-300 uppercase font-light mb-1 tracking-wider">Slippage</div>
                          <div className="text-xs text-zinc-400 font-light">Price impact</div>
                        </div>
                        
                        <div className="glass-light-shimmer rounded-xl p-3">
                          <div className="text-xs text-zinc-300 uppercase font-light mb-1 tracking-wider">Bridge Fees</div>
                          <div className="text-xs text-zinc-400 font-light">Across protocol</div>
                        </div>
                      </div>
                    </>
                  ) : simulation && (
                    <div className="mt-4 space-y-4">
                      {/* Net profit - Main highlight */}
                      <div className="glass-dark p-4 rounded-xl shadow-lg">
                        <div className="text-xs text-zinc-400 uppercase mb-2 font-light tracking-wider">Net Expected Profit</div>
                        <span className={`text-2xl font-light font-mono ${
                          (simulation.netProfitUsd || 0) > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${(simulation.netProfitUsd || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Trading Details */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="glass-light rounded-xl p-3">
                            <div className="text-xs text-zinc-400 uppercase mb-1 font-light tracking-wider">Buy Price</div>
                            <div className="text-sm font-light text-zinc-100 font-mono">${(simulation.buyPrice || 0).toFixed(2)}</div>
                          </div>
                          <div className="glass-light rounded-xl p-3">
                            <div className="text-xs text-zinc-400 uppercase mb-1 font-light tracking-wider">Sell Price</div>
                            <div className="text-sm font-light text-zinc-100 font-mono">${(simulation.sellPrice || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="glass-light rounded-xl p-3">
                            <div className="text-xs text-zinc-400 uppercase mb-1 font-light tracking-wider">Spread</div>
                            <div className="text-sm font-light text-zinc-100">{(simulation.spreadPercent || simulation.spreadPct || 0).toFixed(3)}%</div>
                          </div>
                          <div className="glass-light rounded-xl p-3">
                            <div className="text-xs text-zinc-400 uppercase mb-1 font-light tracking-wider">Amount</div>
                            <div className="text-sm font-light font-mono text-zinc-100">{(simulation.amountInEth || 0).toFixed(3)} ETH</div>
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div>
                        <div className="text-xs text-zinc-400 uppercase mb-3 font-light tracking-wider">Cost Breakdown</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 font-light">Gas Cost:</span>
                            <span className="font-mono text-zinc-300 font-light">-${(simulation.gasCostUsd || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 font-light">Slippage:</span>
                            <span className="font-mono text-zinc-300 font-light">-${(simulation.slippageUsd || 0).toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 font-light">DEX Fees:</span>
                            <span className="font-mono text-zinc-300 font-light">-${(simulation.feesUsd || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 font-light">Bridging Fees:</span>
                            <span className="font-mono text-zinc-300 font-light">-${(simulation.bridgingFeesUsd || 0).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-white/10 pt-2 flex justify-between items-center text-xs font-light">
                            <span className="text-zinc-200">Net Profit:</span>
                            <span
                              className={`font-mono ${
                                (simulation.netProfitUsd || 0) > 0
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }`}
                            >
                              ${(simulation.netProfitUsd || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
