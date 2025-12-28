'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useUserBalance, useContractConfigured, useCorrectNetwork } from '@/lib/hooks/useContract';
import { CONTRACT_ADDRESS } from '@/lib/contract-abi';

interface ApiResponse {
  loading: boolean;
  data: any;
  error: string | null;
  timestamp: Date | null;
}

export default function DebugPage() {
  const { address, isConnected } = useAccount();
  const { balanceFormatted } = useUserBalance();
  const { isConfigured } = useContractConfigured();
  const { isCorrectNetwork, chainName } = useCorrectNetwork();

  const [prices, setPrices] = useState<ApiResponse>({
    loading: false,
    data: null,
    error: null,
    timestamp: null,
  });

  const [simulation, setSimulation] = useState<ApiResponse>({
    loading: false,
    data: null,
    error: null,
    timestamp: null,
  });

  const [decision, setDecision] = useState<ApiResponse>({
    loading: false,
    data: null,
    error: null,
    timestamp: null,
  });

  const [detection, setDetection] = useState<ApiResponse>({
    loading: false,
    data: null,
    error: null,
    timestamp: null,
  });

  const fetchPrices = async () => {
    setPrices(p => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setPrices({ loading: false, data, error: null, timestamp: new Date() });
    } catch (err: any) {
      setPrices(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  const fetchDetection = async () => {
    setDetection(p => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/detect');
      const data = await res.json();
      setDetection({ loading: false, data, error: null, timestamp: new Date() });
    } catch (err: any) {
      setDetection(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  const fetchSimulation = async () => {
    setSimulation(p => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInEth: 0.01 }),
      });
      const data = await res.json();
      setSimulation({ loading: false, data, error: null, timestamp: new Date() });
    } catch (err: any) {
      setSimulation(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  const fetchDecision = async () => {
    if (!simulation.data?.simulation) {
      setDecision(p => ({ ...p, error: 'Run simulation first' }));
      return;
    }

    setDecision(p => ({ ...p, loading: true, error: null }));
    try {
      const sim = simulation.data.simulation;
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spread: sim.spreadPct,
          gasCostUsd: sim.gasCostUsd,
          slippageUsd: sim.slippageUsd,
          feesUsd: sim.feesUsd,
          netProfitUsd: sim.netProfitUsd,
          liquidityDepth: sim.liquidityDepth,
          amountInEth: sim.amountInEth,
        }),
      });
      const data = await res.json();
      setDecision({ loading: false, data, error: null, timestamp: new Date() });
    } catch (err: any) {
      setDecision(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  const fetchAll = async () => {
    await fetchPrices();
    await fetchDetection();
    await fetchSimulation();
  };

  useEffect(() => {
    fetchPrices();
    fetchDetection();
  }, []);

  return (
    <div className="min-h-screen bg-pure-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-text-secondary hover:text-white text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight mt-2">Debug Panel</h1>
              <p className="text-text-secondary mt-1">Raw API outputs and contract state</p>
            </div>
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
          <div className="divider mt-6" />
        </header>

        {/* Refresh All Button */}
        <div className="flex gap-4">
          <button onClick={fetchAll} className="btn-execute">
            Refresh All APIs
          </button>
          <button onClick={fetchDecision} className="btn-execute" disabled={!simulation.data}>
            Fetch AI Decision
          </button>
        </div>

        {/* Contract State */}
        <section className="glass-card p-6">
          <h2 className="text-sm uppercase tracking-wide text-text-tertiary mb-4">
            Contract State
          </h2>
          
          <div className="p-4 bg-charcoal rounded border border-steel-gray">
            <pre className="text-xs mono overflow-x-auto text-metallic-silver">
{JSON.stringify({
  contractAddress: CONTRACT_ADDRESS || 'NOT_DEPLOYED',
  isConfigured,
  network: {
    connected: isConnected,
    correctNetwork: isCorrectNetwork,
    chainName,
  },
  user: {
    address: address || 'NOT_CONNECTED',
    contractBalance: balanceFormatted + ' ETH',
  },
}, null, 2)}
            </pre>
          </div>
        </section>

        {/* /api/prices */}
        <section className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm uppercase tracking-wide text-text-tertiary">
              /api/prices
            </h2>
            <div className="flex items-center gap-4">
              {prices.timestamp && (
                <span className="text-xs text-text-secondary">
                  {prices.timestamp.toLocaleTimeString()}
                </span>
              )}
              <button 
                onClick={fetchPrices} 
                disabled={prices.loading}
                className="text-xs px-3 py-1 rounded bg-steel-gray hover:bg-gunmetal transition-colors"
              >
                {prices.loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-charcoal rounded border border-steel-gray">
            {prices.error ? (
              <div className="text-loss text-sm">{prices.error}</div>
            ) : prices.data ? (
              <pre className="text-xs mono overflow-x-auto text-metallic-silver">
                {JSON.stringify(prices.data, null, 2)}
              </pre>
            ) : (
              <div className="text-text-secondary text-sm">Loading...</div>
            )}
          </div>
        </section>

        {/* /api/detect */}
        <section className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm uppercase tracking-wide text-text-tertiary">
              /api/detect
            </h2>
            <div className="flex items-center gap-4">
              {detection.timestamp && (
                <span className="text-xs text-text-secondary">
                  {detection.timestamp.toLocaleTimeString()}
                </span>
              )}
              <button 
                onClick={fetchDetection} 
                disabled={detection.loading}
                className="text-xs px-3 py-1 rounded bg-steel-gray hover:bg-gunmetal transition-colors"
              >
                {detection.loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-charcoal rounded border border-steel-gray">
            {detection.error ? (
              <div className="text-loss text-sm">{detection.error}</div>
            ) : detection.data ? (
              <pre className="text-xs mono overflow-x-auto text-metallic-silver">
                {JSON.stringify(detection.data, null, 2)}
              </pre>
            ) : (
              <div className="text-text-secondary text-sm">Loading...</div>
            )}
          </div>
        </section>

        {/* /api/simulate */}
        <section className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm uppercase tracking-wide text-text-tertiary">
              /api/simulate
            </h2>
            <div className="flex items-center gap-4">
              {simulation.timestamp && (
                <span className="text-xs text-text-secondary">
                  {simulation.timestamp.toLocaleTimeString()}
                </span>
              )}
              <button 
                onClick={fetchSimulation} 
                disabled={simulation.loading}
                className="text-xs px-3 py-1 rounded bg-steel-gray hover:bg-gunmetal transition-colors"
              >
                {simulation.loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-charcoal rounded border border-steel-gray">
            {simulation.error ? (
              <div className="text-loss text-sm">{simulation.error}</div>
            ) : simulation.data ? (
              <pre className="text-xs mono overflow-x-auto text-metallic-silver">
                {JSON.stringify(simulation.data, null, 2)}
              </pre>
            ) : (
              <div className="text-text-secondary text-sm">Click Refresh to run simulation</div>
            )}
          </div>
        </section>

        {/* /api/decide */}
        <section className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm uppercase tracking-wide text-text-tertiary">
              /api/decide
            </h2>
            <div className="flex items-center gap-4">
              {decision.timestamp && (
                <span className="text-xs text-text-secondary">
                  {decision.timestamp.toLocaleTimeString()}
                </span>
              )}
              <button 
                onClick={fetchDecision} 
                disabled={decision.loading || !simulation.data}
                className="text-xs px-3 py-1 rounded bg-steel-gray hover:bg-gunmetal transition-colors disabled:opacity-50"
              >
                {decision.loading ? 'Loading...' : 'Fetch Decision'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-charcoal rounded border border-steel-gray">
            {decision.error ? (
              <div className="text-loss text-sm">{decision.error}</div>
            ) : decision.data ? (
              <pre className="text-xs mono overflow-x-auto text-metallic-silver">
                {JSON.stringify(decision.data, null, 2)}
              </pre>
            ) : (
              <div className="text-text-secondary text-sm">Run simulation first, then fetch decision</div>
            )}
          </div>
        </section>

        {/* Environment Info */}
        <section className="glass-card p-6">
          <h2 className="text-sm uppercase tracking-wide text-text-tertiary mb-4">
            Environment
          </h2>
          
          <div className="p-4 bg-charcoal rounded border border-steel-gray">
            <pre className="text-xs mono overflow-x-auto text-metallic-silver">
{JSON.stringify({
  nodeEnv: process.env.NODE_ENV,
  baseSepolia: {
    chainId: 84532,
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
  },
  uniswap: {
    swapRouter: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
    weth: '0x4200000000000000000000000000000000000006',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
}, null, 2)}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 text-text-secondary text-sm">
          <p>Debug panel for judges and developers</p>
        </footer>

      </div>
    </div>
  );
}
