'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { createPublicClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import Link from 'next/link';

// Testnet addresses for Base Sepolia
const TESTNET_CONFIG = {
  swapRouter: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
  weth: '0x4200000000000000000000000000000000000006',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Contract bytecode would be imported from compiled artifacts
// For demo purposes, we'll show the deployment flow
const CONTRACT_BYTECODE = '0x'; // Placeholder - actual bytecode from hardhat compile

export default function DeployPage() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isCorrectNetwork = chain?.id === baseSepolia.id;

  const handleDeploy = async () => {
    if (!walletClient || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Please switch to Base Sepolia network');
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      // Note: In production, you would deploy the actual contract
      // For hackathon demo, recommend using Hardhat CLI:
      // npx hardhat run scripts/deploy.ts --network baseSepolia
      
      setError(
        'For deployment, run in terminal:\n\n' +
        'npx hardhat run scripts/deploy.ts --network baseSepolia\n\n' +
        'This will deploy the contract and auto-update your .env.local file.'
      );
      
    } catch (err: any) {
      setError(err.message || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-pure-black p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-text-secondary hover:text-white text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight mt-2">Deploy Contract</h1>
              <p className="text-text-secondary mt-1">Deploy ArbitrageExecutor to testnet</p>
            </div>
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
          <div className="divider mt-6" />
        </header>

        {/* Network Info */}
        <section className="glass-card p-6">
          <h2 className="text-sm uppercase tracking-wide text-text-tertiary mb-4">
            Network Configuration
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Network</span>
              <span className="mono">Base Sepolia</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Chain ID</span>
              <span className="mono">84532</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">RPC</span>
              <span className="mono text-sm">https://sepolia.base.org</span>
            </div>
            
            <div className="divider my-4" />
            
            <div className="flex justify-between">
              <span className="text-text-secondary">SwapRouter</span>
              <span className="mono text-xs">{TESTNET_CONFIG.swapRouter.slice(0, 10)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">WETH</span>
              <span className="mono text-xs">{TESTNET_CONFIG.weth.slice(0, 10)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">USDC</span>
              <span className="mono text-xs">{TESTNET_CONFIG.usdc.slice(0, 10)}...</span>
            </div>
          </div>
        </section>

        {/* Wallet Status */}
        <section className="glass-card p-6">
          <h2 className="text-sm uppercase tracking-wide text-text-tertiary mb-4">
            Wallet Status
          </h2>
          
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Connected</span>
                <span className="text-profit">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Address</span>
                <span className="mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Network</span>
                <span className={isCorrectNetwork ? 'text-profit' : 'text-loss'}>
                  {isCorrectNetwork ? 'Base Sepolia ✓' : 'Wrong Network'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-text-secondary mb-4">Connect wallet to deploy</p>
              <ConnectButton />
            </div>
          )}
        </section>

        {/* Deploy Section */}
        <section className="glass-card p-6">
          <h2 className="text-sm uppercase tracking-wide text-text-tertiary mb-4">
            Deployment
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded bg-charcoal border border-steel-gray">
              <p className="text-sm text-text-secondary mb-2">Recommended deployment method:</p>
              <code className="block bg-pure-black p-3 rounded text-sm mono text-metallic-silver">
                npx hardhat run scripts/deploy.ts --network baseSepolia
              </code>
            </div>

            <p className="text-xs text-text-tertiary">
              The deploy script will automatically update your .env.local with the contract address.
            </p>

            <button
              onClick={handleDeploy}
              disabled={!isConnected || !isCorrectNetwork || isDeploying}
              className="w-full btn-execute"
            >
              {isDeploying ? 'Deploying...' : 'Show Deploy Instructions'}
            </button>
          </div>

          {/* Error/Info Display */}
          {error && (
            <div className="mt-4 p-4 rounded bg-charcoal border border-steel-gray">
              <pre className="text-sm text-text-secondary whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {/* Deployed Address */}
          {deployedAddress && (
            <div className="mt-4 space-y-3">
              <div className="divider" />
              <div>
                <div className="text-xs text-text-secondary uppercase mb-1">Contract Address</div>
                <div className="mono text-sm break-all">{deployedAddress}</div>
              </div>
              <a
                href={`https://sepolia.basescan.org/address/${deployedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2 rounded bg-steel-gray text-text-secondary hover:text-white transition-colors text-sm"
              >
                View on Explorer →
              </a>
            </div>
          )}
        </section>

        {/* Faucet Info */}
        <section className="glass-card p-6">
          <h2 className="text-sm uppercase tracking-wide text-text-tertiary mb-4">
            Need Testnet ETH?
          </h2>
          
          <div className="space-y-3">
            <a
              href="https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded bg-charcoal border border-steel-gray hover:border-metallic-silver transition-colors"
            >
              <div className="font-medium">Coinbase Faucet</div>
              <div className="text-xs text-text-secondary">Get Base Sepolia ETH</div>
            </a>
            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded bg-charcoal border border-steel-gray hover:border-metallic-silver transition-colors"
            >
              <div className="font-medium">Alchemy Faucet</div>
              <div className="text-xs text-text-secondary">Alternative faucet</div>
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
