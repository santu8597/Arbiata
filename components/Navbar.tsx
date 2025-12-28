'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useUserBalance } from '@/lib/hooks/useContract';
import MetallicLogo from '@/components/MetallicLogo';
import { User } from 'lucide-react';

export default function Navbar() {
  const { isConnected } = useAccount();
  const { balance } = useUserBalance();

  const balanceFormatted = balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';

  return (
    <nav className="navbar-floating">
      <div className="px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-12 w-48">
              <MetallicLogo size="large" className="h-full w-full" />
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/dashboard" 
              className="text-sm text-zinc-300 hover:text-zinc-100 transition-all duration-300 font-light"
            >
              Dashboard
            </Link>
            <Link 
              href="/simulation" 
              className="text-sm text-zinc-300 hover:text-zinc-100 transition-all duration-300 font-light"
            >
              Simulator
            </Link>
            <Link 
              href="/about" 
              className="text-sm text-zinc-300 hover:text-zinc-100 transition-all duration-300 font-light"
            >
              About
            </Link>
            <Link 
              href="/debug" 
              className="text-sm text-zinc-300 hover:text-zinc-100 transition-all duration-300 font-light"
            >
              Debug
            </Link>
            {isConnected && (
              <Link 
                href="/profile" 
                className="text-sm text-zinc-300 hover:text-zinc-100 transition-all duration-300 font-light flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
            )}
          </div>

          {/* Right Section - Balance + Connect */}
          <div className="flex items-center space-x-4">
            {isConnected && balance && balance > 0n && (
              <div className="hidden sm:flex items-center space-x-2 px-4 py-2 glass-light rounded-xl">
                <span className="text-xs text-zinc-400 font-light">Deposited:</span>
                <span className="font-mono text-sm font-light text-zinc-200">
                  {balanceFormatted} ETH
                </span>
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
