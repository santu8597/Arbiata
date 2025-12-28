'use client';

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight, TrendingUp, Zap, Shield, Bot, DollarSign, BarChart3 } from "lucide-react";
import { useAccount } from "wagmi";
import Link from "next/link";
import Hyperspeed from "@/components/Hyperspeed";
import MetallicLogo from "@/components/MetallicLogo";

export default function LandingPage() {
  const { isConnected } = useAccount();

  const handleGetStarted = () => {
    if (!isConnected) {
      // Just show connect button, no redirection needed
      return;
    } else {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Hyperspeed Background */}
      <div className="absolute inset-0 z-0">
        <Hyperspeed effectOptions={{
          colors: {
            roadColor: 0x080808,
            islandColor: 0x0a0a0a,
            background: 0x000000,
            shoulderLines: 0x20B2AA,
            brokenLines: 0x20B2AA,
            leftCars: [0x20B2AA, 0x008B8B, 0x006666],
            rightCars: [0x800000, 0x8B0000, 0x660000],
            sticks: 0x20B2AA
          }
        }} />
      </div>
      
      {/* Overlay to improve text readability */}
      <div className="absolute inset-0 bg-black/40 z-10"></div>

      <div className="relative z-20">
        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center p-6 min-h-screen">
          <div className="text-center max-w-3xl mx-auto space-y-12">
            {/* Logo & Title */}
              <div className="flex flex-col items-center justify-center">
                <MetallicLogo className="relative" />
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed relative bottom-28">
                Execution-Aware DeFi Arbitrage
              </p>
              </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-2xl hover:shadow-red-500/20 hover:border-red-500/30 transition-all duration-300 group">
                <div className="mb-4 bg-red-500/20 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <TrendingUp className="h-6 w-6 text-red-300" />
                </div>
                <h3 className="text-lg font-light mb-3 text-white">Profit Enforced</h3>
                <p className="text-white/70 font-extralight leading-relaxed text-sm">
                  Smart contracts revert transactions on-chain if profit disappears. No losses from MEV or slippage.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-2xl hover:shadow-teal-500/20 hover:border-teal-500/30 transition-all duration-300 group">
                <div className="mb-4 bg-teal-500/20 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                  <BarChart3 className="h-6 w-6 text-teal-300" />
                </div>
                <h3 className="text-lg font-light mb-3 text-white">Real-Time Analytics</h3>
                <p className="text-white/70 font-extralight leading-relaxed text-sm">
                  Live market monitoring with candlestick charts, order books, and profit simulation tools.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-2xl hover:shadow-red-500/20 hover:border-red-500/30 transition-all duration-300 group">
                <div className="mb-4 bg-red-500/20 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <DollarSign className="h-6 w-6 text-red-300" />
                </div>
                <h3 className="text-lg font-light mb-3 text-white">Maximize Returns</h3>
                <p className="text-white/70 font-extralight leading-relaxed text-sm">
                  Sophisticated algorithms identify and capture arbitrage opportunities across Arbitrum and Base networks.
                </p>
              </div>
            </div>
            
            {/* Call to Action */}
            <div className="flex flex-col items-center gap-8 pt-8">
              {!isConnected ? (
                <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl hover:shadow-teal-500/20 hover:border-teal-500/30 transition-all duration-300 group">
                  <div className="flex items-center gap-4">
                    <ConnectButton />
                    <ArrowRight className="h-6 w-6 text-teal-300 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              ) : (
                <Link href="/dashboard" className="group">
                  <div className="bg-gradient-to-r from-teal-500/20 to-red-500/20 backdrop-blur-md p-8 rounded-2xl border border-teal-500/30 shadow-2xl hover:shadow-teal-500/40 hover:border-teal-500/50 transition-all duration-300">
                    <div className="flex items-center gap-4 text-xl font-light text-white">
                      <span>Enter Trading Dashboard</span>
                      <ArrowRight className="h-6 w-6 text-teal-300 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </Link>
              )}
            </div>

            
          </div>
        </main>
      </div>
    </div>
  );
}
