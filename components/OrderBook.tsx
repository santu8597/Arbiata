'use client';

import { useState, useEffect } from 'react';

interface OrderBookProps {
  prices: any;
  className?: string;
}

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export function OrderBook({ prices, className = "" }: OrderBookProps) {
  const [orderBook, setOrderBook] = useState<{
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    spread: number;
  }>({
    bids: [],
    asks: [],
    spread: 0
  });

  // Generate realistic order book data based on current prices
  useEffect(() => {
    if (!prices?.base?.price || !prices?.arbitrum?.price) return;

    const basePrice = prices.base.price;
    const arbPrice = prices.arbitrum.price;
    const midPrice = (basePrice + arbPrice) / 2;
    
    // Generate bid orders (buy orders) - below mid price
    const bids: OrderBookEntry[] = [];
    let totalBid = 0;
    for (let i = 0; i < 10; i++) {
      const price = midPrice - (i + 1) * 0.001 - Math.random() * 0.002;
      const size = Math.random() * 1000 + 100;
      totalBid += size;
      bids.push({
        price,
        size,
        total: totalBid
      });
    }

    // Generate ask orders (sell orders) - above mid price
    const asks: OrderBookEntry[] = [];
    let totalAsk = 0;
    for (let i = 0; i < 10; i++) {
      const price = midPrice + (i + 1) * 0.001 + Math.random() * 0.002;
      const size = Math.random() * 1000 + 100;
      totalAsk += size;
      asks.unshift({
        price,
        size,
        total: totalAsk
      });
    }

    setOrderBook({
      bids,
      asks,
      spread: asks[0]?.price - bids[0]?.price || 0
    });
  }, [prices]);

  if (!prices) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 ${className}`}>
        <div className="text-center text-gray-400">Connect wallet to view order book</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">Order Book</h3>
          <div className="flex items-center gap-2 text-xs">
            <div className="text-gray-400">Spread</div>
            <div className="text-red-400 font-mono">
              {orderBook.spread.toFixed(3)}%
            </div>
          </div>
        </div>
      </div>

      {/* Order Book Content */}
      <div className="p-4">
        {/* Price/Size/Total Headers */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-gray-400 font-medium">
          <div>Price (USDC)</div>
          <div className="text-right">Size (HYPE)</div>
          <div className="text-right">Total (HYPE)</div>
        </div>

        {/* Asks (Sell Orders) - Red */}
        <div className="mb-2">
          {orderBook.asks.map((ask, index) => (
            <div key={`ask-${index}`} className="grid grid-cols-3 gap-2 text-xs hover:bg-red-500/10 py-1 px-1 rounded">
              <div className="text-red-400 font-mono">{ask.price.toFixed(3)}</div>
              <div className="text-right text-white font-mono">{ask.size.toFixed(2)}</div>
              <div className="text-right text-gray-400 font-mono">{ask.total.toFixed(0)}</div>
            </div>
          ))}
        </div>

        {/* Spread Indicator */}
        <div className="border-t border-gray-700 my-2 pt-2">
          <div className="text-center">
            <div className="text-xs text-gray-500">
              Mark Price: <span className="text-white font-mono">${((orderBook.asks[0]?.price + orderBook.bids[0]?.price) / 2 || 0).toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Bids (Buy Orders) - Green */}
        <div>
          {orderBook.bids.map((bid, index) => (
            <div key={`bid-${index}`} className="grid grid-cols-3 gap-2 text-xs hover:bg-green-500/10 py-1 px-1 rounded">
              <div className="text-green-400 font-mono">{bid.price.toFixed(3)}</div>
              <div className="text-right text-white font-mono">{bid.size.toFixed(2)}</div>
              <div className="text-right text-gray-400 font-mono">{bid.total.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}