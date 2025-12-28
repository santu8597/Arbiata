'use client';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, Crosshair, Minus, Type, Circle, LineChart, AreaChart } from "lucide-react";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  prices: any;
  loading: boolean;
  onPriceUpdate?: (basePrice: number, arbitrumPrice: number) => void;
}

// Generate realistic continuous candle data
function generateInitialCandles(count: number, basePrice: number = 2925): CandleData[] {
  const candles: CandleData[] = [];
  let lastClose = basePrice;
  
  const now = Math.floor(Date.now() / 1000);
  const interval = 60; // 1 minute candles
  
  let trend = 0;
  let trendStrength = Math.random() * 0.0005;
  let trendDuration = Math.floor(Math.random() * 15) + 10;
  let trendCounter = 0;
  
  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * interval;
    
    if (trendCounter >= trendDuration) {
      trend = Math.random() > 0.5 ? 1 : -1;
      trendStrength = Math.random() * 0.0005 + 0.0002;
      trendDuration = Math.floor(Math.random() * 15) + 10;
      trendCounter = 0;
    }
    
    const volatility = basePrice * 0.0012;
    const randomChange = (2 * Math.random() - 1) * volatility;
    const trendChange = trend * trendStrength * basePrice;
    
    const open = lastClose;
    const close = open + randomChange + trendChange;
    
    const wickSize = volatility * (Math.random() * 0.8 + 0.2);
    const highWick = Math.random() * wickSize;
    const lowWick = Math.random() * wickSize;
    
    const high = Math.max(open, close) + highWick;
    const low = Math.min(open, close) - lowWick;
    
    const priceChange = Math.abs(close - open);
    const changeRatio = priceChange / basePrice;
    const baseVolume = 10000 + Math.random() * 90000;
    const volumeMultiplier = 1 + (changeRatio * 100);
    const volume = Math.floor(baseVolume * volumeMultiplier);
    
    const hasSpike = Math.random() < 0.05;
    const finalVolume = hasSpike ? volume * (Math.random() * 3 + 2) : volume;
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.floor(finalVolume)
    });
    
    lastClose = close;
    trendCounter++;
  }
  
  return candles;
}

// Format large numbers to compact representation (K, M, B, T)
function formatLiquidity(value: string): string {
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  
  if (numericValue >= 1e12) {
    return `${(numericValue / 1e12).toFixed(1)}T USDC`;
  } else if (numericValue >= 1e9) {
    return `${(numericValue / 1e9).toFixed(1)}B USDC`;
  } else if (numericValue >= 1e6) {
    return `${(numericValue / 1e6).toFixed(1)}M USDC`;
  } else if (numericValue >= 1e3) {
    return `${(numericValue / 1e3).toFixed(1)}K USDC`;
  } else {
    return `${numericValue.toFixed(2)} USDC`;
  }
}

export function CandlestickChart({ prices, loading, onPriceUpdate }: CandlestickChartProps) {
  const arbitrumPrice = prices?.arbitrum?.price || 2925;
  // Cap base price between 3000 and 3002
  const basePrice = Math.max(3000, Math.min(3002, prices?.base?.price || 3001));
  
  const [arbitrumCandles, setArbitrumCandles] = useState<CandleData[]>(() => generateInitialCandles(50, arbitrumPrice));
  const [baseCandles, setBaseCandles] = useState<CandleData[]>(() => generateInitialCandles(50, basePrice));
  
  const [activeTimeframe, setActiveTimeframe] = useState("1h");
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');

  const arbitrumCurrentPrice = arbitrumCandles[arbitrumCandles.length - 1]?.close || arbitrumPrice;
  const arbitrumPrevPrice = arbitrumCandles[arbitrumCandles.length - 2]?.close || arbitrumCurrentPrice;
  const arbitrumChange24h = ((arbitrumCurrentPrice - arbitrumPrevPrice) / arbitrumPrevPrice) * 100;

  const baseCurrentPrice = baseCandles[baseCandles.length - 1]?.close || basePrice;
  const basePrevPrice = baseCandles[baseCandles.length - 2]?.close || baseCurrentPrice;
  const baseChange24h = ((baseCurrentPrice - basePrevPrice) / basePrevPrice) * 100;

  const [arbitrumPriceData, setArbitrumPriceData] = useState({
    price: arbitrumCurrentPrice,
    change24h: arbitrumChange24h,
    volume: "245,128,450.32 USDC",
    marketCap: "9.5B USDC"
  });

  const [basePriceData, setBasePriceData] = useState({
    price: baseCurrentPrice,
    change24h: baseChange24h,
    volume: "382,478,369.99 USDC",
    marketCap: "15.0B USDC"
  });

  // Notify parent component of price updates
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(basePriceData.price, arbitrumPriceData.price);
    }
  }, [basePriceData.price, arbitrumPriceData.price, onPriceUpdate]);

  // Update candles when real prices come in
  useEffect(() => {
    if (!prices) return;
    
    let marketTrend = Math.random() > 0.5 ? 1 : -1;
    let trendStrength = Math.random() * 0.0001 + 0.00005; // Further reduced for gradual changes
    let trendDuration = Math.floor(Math.random() * 3) + 2; // Shorter duration (2-4 updates)
    let trendCounter = 0;
    let volatilityBase = 0.0003; // Further reduced for very gradual changes
    let volatilityMultiplier = 1;
    
    const interval = setInterval(() => {
      if (trendCounter >= trendDuration) {
        // Higher chance to reverse direction for more alternating movement
        if (Math.random() < 0.85) {
          marketTrend *= -1;
        }
        
        trendStrength = Math.random() * 0.0001 + 0.00005; // Further reduced for gradual changes
        trendDuration = Math.floor(Math.random() * 3) + 2; // Shorter duration (2-4 updates)
        trendCounter = 0;
        
        // Removed volatility multiplier spikes for smoother movement
        volatilityMultiplier = 1;
      }
      
      // Update Arbitrum candles
      setArbitrumCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        const now = Math.floor(Date.now() / 1000);
        
        const effectiveVolatility = volatilityBase * volatilityMultiplier;
        const randomFactor = (Math.random() - 0.5) * 2;
        const trendInfluence = marketTrend * trendStrength;
        const netChange = lastCandle.close * (randomFactor * effectiveVolatility + trendInfluence);
        
        const newCandle: CandleData = {
          time: now,
          open: lastCandle.close,
          close: Number((lastCandle.close + netChange).toFixed(2)),
          high: 0,
          low: 0,
          volume: 0
        };
        
        const wickSizeMultiplier = 0.3 + (Math.random() * 0.4); // Reduced wick size
        const highWick = Math.random() * lastCandle.close * effectiveVolatility * wickSizeMultiplier;
        const lowWick = Math.random() * lastCandle.close * effectiveVolatility * wickSizeMultiplier;
        
        newCandle.high = Number((Math.max(newCandle.open, newCandle.close) + highWick).toFixed(2));
        newCandle.low = Number((Math.min(newCandle.open, newCandle.close) - lowWick).toFixed(2));
        
        const priceChangePercent = Math.abs(newCandle.close - newCandle.open) / newCandle.open;
        const baseVolume = 400000 + Math.random() * 800000;
        const volumeMultiplier = 1 + (priceChangePercent * 50); // Reduced from 200 to 50
        
        const hasSpike = trendCounter === 0 || Math.random() < 0.05; // Reduced spike frequency
        newCandle.volume = Math.floor(baseVolume * volumeMultiplier * (hasSpike ? (Math.random() * 1.3 + 1) : 1)); // Reduced spike size
        
        const newCandles = [...prev.slice(-49), newCandle];
        
        const lookbackIndex = Math.max(0, newCandles.length - 24);
        const oldPrice = newCandles[lookbackIndex]?.close || newCandle.open;
        const newChange24h = ((newCandle.close - oldPrice) / oldPrice) * 100;
        
        setArbitrumPriceData(prevData => ({
          ...prevData,
          price: newCandle.close,
          change24h: newChange24h,
          volume: `${Math.floor(newCandle.volume / 1000).toLocaleString()},${(Math.floor(newCandle.volume % 1000) + 1000).toString().substring(1)} USDC`
        }));
        
        return newCandles;
      });

      // Update Base candles
      setBaseCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        const now = Math.floor(Date.now() / 1000);
        
        const effectiveVolatility = volatilityBase * volatilityMultiplier;
        const randomFactor = (Math.random() - 0.5) * 2;
        const trendInfluence = marketTrend * trendStrength;
        const netChange = lastCandle.close * (randomFactor * effectiveVolatility + trendInfluence);
        
        // Cap the close price between 3000 and 3002
        const uncappedClose = lastCandle.close + netChange;
        const cappedClose = Math.max(3000, Math.min(3002, uncappedClose));
        
        const newCandle: CandleData = {
          time: now,
          open: lastCandle.close,
          close: Number(cappedClose.toFixed(2)),
          high: 0,
          low: 0,
          volume: 0
        };
        
        const wickSizeMultiplier = 0.3 + (Math.random() * 0.4); // Reduced wick size
        const highWick = Math.random() * lastCandle.close * effectiveVolatility * wickSizeMultiplier;
        const lowWick = Math.random() * lastCandle.close * effectiveVolatility * wickSizeMultiplier;
        
        // Cap high and low within the 3000-3002 range
        const uncappedHigh = Math.max(newCandle.open, newCandle.close) + highWick;
        const uncappedLow = Math.min(newCandle.open, newCandle.close) - lowWick;
        
        newCandle.high = Number(Math.min(3002, uncappedHigh).toFixed(2));
        newCandle.low = Number(Math.max(3000, uncappedLow).toFixed(2));
        
        const priceChangePercent = Math.abs(newCandle.close - newCandle.open) / newCandle.open;
        const baseVolume = 400000 + Math.random() * 800000;
        const volumeMultiplier = 1 + (priceChangePercent * 50); // Reduced from 200 to 50
        
        const hasSpike = trendCounter === 0 || Math.random() < 0.05; // Reduced spike frequency
        newCandle.volume = Math.floor(baseVolume * volumeMultiplier * (hasSpike ? (Math.random() * 1.3 + 1) : 1)); // Reduced spike size
        
        const newCandles = [...prev.slice(-49), newCandle];
        
        const lookbackIndex = Math.max(0, newCandles.length - 24);
        const oldPrice = newCandles[lookbackIndex]?.close || newCandle.open;
        const newChange24h = ((newCandle.close - oldPrice) / oldPrice) * 100;
        
        setBasePriceData(prevData => ({
          ...prevData,
          price: newCandle.close,
          change24h: newChange24h,
          volume: `${Math.floor(newCandle.volume / 1000).toLocaleString()},${(Math.floor(newCandle.volume % 1000) + 1000).toString().substring(1)} USDC`
        }));
        
        trendCounter++;
        return newCandles;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [prices]);

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "D", "W"];
  const tools = [
    { icon: BarChart3, name: "Candlestick", action: () => setChartType('candlestick'), active: chartType === 'candlestick' },
    { icon: LineChart, name: "Line", action: () => setChartType('line'), active: chartType === 'line' },
    { icon: AreaChart, name: "Area", action: () => setChartType('area'), active: chartType === 'area' },
    { icon: TrendingUp, name: "Trend" },
    { icon: Crosshair, name: "Crosshair" },
    { icon: Minus, name: "Horizontal Line" },
    { icon: Type, name: "Text" },
    { icon: Circle, name: "Circle" }
  ];

  return (
    <div className="space-y-6 flex flex-col font-light">
      {/* Arbitrum Chart */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl h-80 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-900 rounded-full"></div>
              <span className="text-lg font-light text-yellow-400">Arbitrum</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-light tracking-wider">Mark Price:</span>
              <motion.div 
                className={`font-mono font-light ${arbitrumPriceData.change24h >= 0 ? 'text-teal-300' : 'text-red-300'}`}
                key={arbitrumPriceData.price}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                ${arbitrumPriceData.price.toFixed(2)}
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">24h Change:</span>
              <div className={`font-mono font-bold flex items-center space-x-1 ${
                arbitrumPriceData.change24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {arbitrumPriceData.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{arbitrumPriceData.change24h >= 0 ? '+' : ''}{arbitrumPriceData.change24h.toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">24h Volume:</span>
              <div className="font-mono text-sm">{arbitrumPriceData.volume}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Total Liquidity:</span>
              <div className="font-mono text-sm">{arbitrumPriceData.marketCap}</div>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex min-h-0">
          {/* Toolbar */}
          <div className="w-12 border-r border-white/10 flex flex-col items-center py-4 space-y-2">
            {tools.map((tool, index) => (
              <button
                key={index}
                className={`w-8 h-8 rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center ${
                  tool.active ? 'bg-teal-500/20 text-teal-300 shadow-lg' : 'text-gray-400 hover:text-teal-300'
                }`}
                onClick={tool.action}
                title={tool.name}
              >
                <tool.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Chart Content */}
          <div className="flex-1 relative bg-black/20 backdrop-blur-sm">
            {/* Trading View Style Chart */}
            <div className="h-full w-full">
              <TradingViewChart 
                candles={arbitrumCandles} 
                chartType={chartType}
                currentPrice={arbitrumPriceData.price}
                timeframe={activeTimeframe}
                chain="arbitrum"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Base Chart */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl h-80 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-900 rounded-full"></div>
              <span className="text-lg font-light text-cyan-800">Base</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-light tracking-wider">Mark Price:</span>
              <motion.div 
                className={`font-mono font-light ${basePriceData.change24h >= 0 ? 'text-teal-300' : 'text-red-300'}`}
                key={basePriceData.price}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                ${basePriceData.price.toFixed(2)}
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-light tracking-wider">24h Change:</span>
              <div className={`font-mono font-light flex items-center space-x-1 ${
                basePriceData.change24h >= 0 ? 'text-teal-300' : 'text-red-300'
              }`}>
                {basePriceData.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{basePriceData.change24h >= 0 ? '+' : ''}{basePriceData.change24h.toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-light tracking-wider">24h Volume:</span>
              <div className="font-mono text-sm font-light text-gray-300">{basePriceData.volume}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-light tracking-wider">Total Liquidity:</span>
              <div className="font-mono text-sm font-light text-gray-300">{basePriceData.marketCap}</div>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex min-h-0">
          {/* Toolbar */}
          <div className="w-12 border-r border-white/10 flex flex-col items-center py-4 space-y-2">
            {tools.map((tool, index) => (
              <button
                key={`base-${index}`}
                className={`w-8 h-8 rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center ${
                  tool.active ? 'bg-teal-500/20 text-teal-300 shadow-lg' : 'text-gray-400 hover:text-teal-300'
                }`}
                onClick={tool.action}
                title={tool.name}
              >
                <tool.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Chart Content */}
          <div className="flex-1 relative bg-black/20 backdrop-blur-sm">
            {/* Trading View Style Chart */}
            <div className="h-full w-full">
              <TradingViewChart 
                candles={baseCandles} 
                chartType={chartType}
                currentPrice={basePriceData.price}
                timeframe={activeTimeframe}
                chain="base"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Professional TradingView-style Chart Component
interface TradingViewChartProps {
  candles: CandleData[];
  chartType: 'candlestick' | 'line' | 'area';
  currentPrice: number;
  timeframe: string;
  chain?: 'arbitrum' | 'base';
}

function TradingViewChart({ candles, chartType, currentPrice, timeframe, chain = 'arbitrum' }: TradingViewChartProps) {
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const chartHeight = 280;
  const chartWidth = 1000;
  const padding = { top: 10, right: 60, bottom: 40, left: 10 };

  // For Base chain, use fixed range 3000-3002; for others, calculate dynamically
  let minPrice: number;
  let maxPrice: number;
  
  if (chain === 'base') {
    minPrice = 3000;
    maxPrice = 3002;
  } else {
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    minPrice = Math.min(...allPrices) * 0.998;
    maxPrice = Math.max(...allPrices) * 1.002;
  }
  
  const priceRange = maxPrice - minPrice;

  const maxVolume = Math.max(...candles.map(c => c.volume));

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    
    const candleIndex = Math.round((e.clientX - rect.left - padding.left) / ((rect.width - padding.left - padding.right) / Math.max(candles.length - 1, 1)));
    if (candleIndex >= 0 && candleIndex < candles.length) {
      setHoveredCandle(candles[candleIndex]);
    }
  };

  const scaleX = (index: number) => (index / Math.max(candles.length - 1, 1)) * (chartWidth - padding.left - padding.right) + padding.left;
  const scaleY = (price: number) => chartHeight - padding.bottom - ((price - minPrice) / priceRange) * (chartHeight - padding.top - padding.bottom);
  const scaleVolume = (volume: number) => (volume / maxVolume) * 60;

  const renderGridlines = () => {
    const gridLines = [];
    const priceStep = priceRange / 8;
    
    for (let i = 0; i <= 8; i++) {
      const price = minPrice + (priceStep * i);
      const y = scaleY(price);
      
      gridLines.push(
        <g key={`h-${i}`}>
          <line
            x1={padding.left}
            y1={y}
            x2={chartWidth - padding.right}
            y2={y}
            stroke="rgba(148, 163, 184, 0.08)"
            strokeWidth="1"
          />
          <text
            x={chartWidth - padding.right + 8}
            y={y + 4}
            className="text-xs fill-gray-500"
            fontSize="11"
          >
            {price.toFixed(2)}
          </text>
        </g>
      );
    }
    
    const timeStep = Math.max(Math.floor(candles.length / 8), 1);
    for (let i = 0; i < candles.length; i += timeStep) {
      const x = scaleX(i);
      const time = new Date(candles[i].time * 1000);
      
      gridLines.push(
        <g key={`v-${i}`}>
          <line
            x1={x}
            y1={padding.top}
            x2={x}
            y2={chartHeight - padding.bottom}
            stroke="rgba(148, 163, 184, 0.08)"
            strokeWidth="1"
          />
          <text
            x={x}
            y={chartHeight - padding.bottom + 20}
            className="text-xs fill-gray-500"
            fontSize="10"
            textAnchor="middle"
          >
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        </g>
      );
    }
    
    return gridLines;
  };

  const renderCandlesticks = () => {
    return candles.map((candle, index) => {
      const x = scaleX(index);
      const openY = scaleY(candle.open);
      const closeY = scaleY(candle.close);
      const highY = scaleY(candle.high);
      const lowY = scaleY(candle.low);
      
      const isGreen = candle.close >= candle.open;
      const bodyHeight = Math.abs(closeY - openY);
      const bodyTop = Math.min(openY, closeY);
      const candleWidth = Math.max((chartWidth - padding.left - padding.right) / candles.length - 2, 2);

      return (
        <g key={index} className="cursor-crosshair">
          <line
            x1={x}
            y1={highY}
            x2={x}
            y2={lowY}
            stroke={isGreen ? '#22c55e' : '#ef4444'}
            strokeWidth="1"
          />
          <rect
            x={x - candleWidth/2}
            y={bodyTop}
            width={candleWidth}
            height={Math.max(bodyHeight, 1)}
            fill={isGreen ? '#22c55e' : '#ef4444'}
            stroke={isGreen ? '#22c55e' : '#ef4444'}
            className="hover:opacity-80 transition-opacity"
          />
        </g>
      );
    });
  };

  const renderLineChart = () => {
    const points = candles.map((candle, index) => 
      `${scaleX(index)},${scaleY(candle.close)}`
    ).join(' ');

    return (
      <g>
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {chartType === 'area' && (
          <polygon
            points={`${padding.left},${chartHeight - padding.bottom} ${points} ${scaleX(candles.length - 1)},${chartHeight - padding.bottom}`}
            fill="url(#areaGradient)"
          />
        )}
        
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          className="drop-shadow-sm"
        />
        
        {candles.map((candle, index) => (
          <circle
            key={index}
            cx={scaleX(index)}
            cy={scaleY(candle.close)}
            r="2"
            fill="#3b82f6"
            className="opacity-0 hover:opacity-100 transition-opacity"
          />
        ))}
      </g>
    );
  };

  const renderVolumeChart = () => {
    return candles.map((candle, index) => {
      const x = scaleX(index);
      const volumeHeight = scaleVolume(candle.volume);
      const candleWidth = Math.max((chartWidth - padding.left - padding.right) / candles.length - 1, 1);
      const isGreen = candle.close >= candle.open;

      return (
        <rect
          key={index}
          x={x - candleWidth/2}
          y={chartHeight - padding.bottom + 5}
          width={candleWidth}
          height={volumeHeight}
          fill={isGreen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}
          className="hover:opacity-80 transition-opacity"
        />
      );
    });
  };

  return (
    <div 
      className="w-full h-full bg-gray-950/95 relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredCandle(null)}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {renderGridlines()}
        {chartType === 'candlestick' ? renderCandlesticks() : renderLineChart()}
        
        <line
          x1={padding.left}
          y1={scaleY(currentPrice)}
          x2={chartWidth - padding.right}
          y2={scaleY(currentPrice)}
          stroke="#fbbf24"
          strokeWidth="2"
          strokeDasharray="8,4"
          className="opacity-90"
        />
        
        <g>
          <rect
            x={chartWidth - padding.right - 60}
            y={scaleY(currentPrice) - 12}
            width="55"
            height="24"
            fill="#fbbf24"
            rx="4"
          />
          <text
            x={chartWidth - padding.right - 32}
            y={scaleY(currentPrice) + 4}
            className="text-sm font-bold"
            fontSize="12"
            textAnchor="middle"
            fill="#000"
          >
            {currentPrice.toFixed(2)}
          </text>
        </g>
        
        {hoveredCandle && (
          <g>
            <line
              x1={padding.left}
              y1={mousePos.y}
              x2={chartWidth - padding.right}
              y2={mousePos.y}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line
              x1={mousePos.x}
              y1={padding.top}
              x2={mousePos.x}
              y2={chartHeight - padding.bottom}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          </g>
        )}
      </svg>

      <svg 
        width="100%" 
        height="60" 
        className="absolute bottom-0 left-0"
        style={{ top: chartHeight - 60 }}
      >
        {renderVolumeChart()}
        <text
          x={padding.left}
          y={12}
          className="text-xs fill-gray-500"
          fontSize="9"
        >
          Volume
        </text>
      </svg>

      {hoveredCandle && (
        <div 
          className="absolute bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-xs z-30 pointer-events-none"
          style={{ 
            left: Math.min(mousePos.x + 10, window.innerWidth - 200),
            top: Math.max(mousePos.y - 80, 10)
          }}
        >
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>O: <span className="text-white font-mono">{hoveredCandle.open.toFixed(2)}</span></div>
              <div>H: <span className="text-green-400 font-mono">{hoveredCandle.high.toFixed(2)}</span></div>
              <div>L: <span className="text-red-400 font-mono">{hoveredCandle.low.toFixed(2)}</span></div>
              <div>C: <span className="text-white font-mono">{hoveredCandle.close.toFixed(2)}</span></div>
            </div>
            <div className="text-gray-400 pt-1 border-t border-gray-700">
              Vol: <span className="text-white font-mono">{hoveredCandle.volume.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
