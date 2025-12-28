'use client';

import { useState, useEffect } from 'react';

interface TradeHistoryProps {
  prices: any;
  className?: string;
}

interface Trade {
  id: string;
  timestamp: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  chain: 'base' | 'arbitrum';
}

export function TradeHistory({ prices, className = "" }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);

  // Generate mock trade history based on price updates
  useEffect(() => {
    if (!prices?.base?.price || !prices?.arbitrum?.price) return;

    // Add a new mock trade when prices update
    const newTrade: Trade = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      price: Math.random() > 0.5 ? prices.base.price : prices.arbitrum.price,
      size: Math.random() * 10 + 0.1,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      chain: Math.random() > 0.5 ? 'base' : 'arbitrum'
    };

    setTrades(prev => [newTrade, ...prev.slice(0, 19)]); // Keep only last 20 trades
  }, [prices]);

  // Generate initial mock data
  useEffect(() => {
    const initialTrades: Trade[] = [];
    const now = new Date();
    
    for (let i = 0; i < 15; i++) {
      const tradeTime = new Date(now.getTime() - i * 10000); // 10 seconds apart
      initialTrades.push({
        id: `initial-${i}`,
        timestamp: tradeTime.toLocaleTimeString(),
        price: 44.4 + (Math.random() - 0.5) * 0.2,
        size: Math.random() * 5 + 0.5,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        chain: Math.random() > 0.5 ? 'base' : 'arbitrum'
      });
    }
    
    setTrades(initialTrades);
  }, []);

  if (!prices) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 ${className}`}>
        <div className="text-center text-gray-400">Connect wallet to view trades</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
      </div>

      {/* Trade Headers */}
      <div className="px-4 py-2 border-b border-gray-800">
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-medium">
          <div>Time</div>
          <div className="text-right">Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Chain</div>
        </div>
      </div>

      {/* Trades List */}
      <div className="max-h-96 overflow-y-auto">
        {trades.map((trade) => (
          <div 
            key={trade.id} 
            className={`px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/30 grid grid-cols-4 gap-2 text-xs ${
              trade.side === 'buy' ? 'bg-green-500/5' : 'bg-red-500/5'
            }`}
          >
            <div className="text-gray-400">{trade.timestamp}</div>
            <div className={`text-right font-mono ${
              trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
            }`}>
              {trade.price.toFixed(3)}
            </div>
            <div className="text-right text-white font-mono">
              {trade.size.toFixed(2)}
            </div>
            <div className={`text-right text-xs uppercase font-semibold ${
              trade.chain === 'base' ? 'text-blue-400' : 'text-purple-400'
            }`}>
              {trade.chain}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-800">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-400 mb-1">24h Volume</div>
            <div className="text-white font-mono">
              {trades.reduce((sum, trade) => sum + trade.size, 0).toFixed(1)} HYPE
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Last Trade</div>
            <div className={`font-mono ${
              trades[0]?.side === 'buy' ? 'text-green-400' : 'text-red-400'
            }`}>
              ${trades[0]?.price.toFixed(3) || '-.---'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}