/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Suppress non-critical warnings for optional peer dependencies
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  env: {
    // Base chain (default)
    NEXT_PUBLIC_CHAIN_ID: '8453',
    NEXT_PUBLIC_RPC_URL: 'https://mainnet.base.org',
    
    // Contract addresses (Base)
    NEXT_PUBLIC_SWAP_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481',
    NEXT_PUBLIC_WETH: '0x4200000000000000000000000000000000000006',
    NEXT_PUBLIC_USDC: '0xd9aAEc86B65D86f6A7B5B1b871ab261CD16335B76a',
    NEXT_PUBLIC_QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    
    // Pool addresses (ETH/USDC 0.3% fee)
    NEXT_PUBLIC_ETH_USDC_POOL: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
  },
}

module.exports = nextConfig
