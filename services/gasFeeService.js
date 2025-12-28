import { ethers } from 'ethers';
import { getProvider } from '../utils/provider.js';
import { TOKENS, CHAIN_IDS } from '../config/chains.js';

// Uniswap V3 SwapRouter addresses
const SWAP_ROUTER_ADDRESSES = {
  BASE: '0x2626664c2603336E57B271c5C0b26F421741e481',
  ARBITRUM: '0xE592427A0AEce92De3Edee1F18E0157C05861564'
};

// SwapRouter ABI for exactInputSingle
const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// Base L1 OptimismPortal ABI for deposits
const L1_OPTIMISM_PORTAL_ABI = [
  'function depositTransaction(address _to, uint256 _value, uint64 _gasLimit, bool _isCreation, bytes memory _data) external payable'
];

// Ethereum mainnet OptimismPortal address for Base
const BASE_OPTIMISM_PORTAL_ADDRESS = '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e';

/**
 * Calculate gas fees for depositing ETH from Ethereum mainnet to Base L2
 * @param {string} amountInEth - Amount of ETH to deposit (in ETH, e.g., "0.1")
 * @returns {Object} Gas fee estimates
 */
export async function calculateBaseDepositGasFees(amountInEth) {
  try {
    // Connect to Ethereum mainnet to estimate L1 gas
    const mainnetProvider = new ethers.JsonRpcProvider(
      process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com'
    );

    // Create portal contract instance
    const portalContract = new ethers.Contract(
      BASE_OPTIMISM_PORTAL_ADDRESS,
      L1_OPTIMISM_PORTAL_ABI,
      mainnetProvider
    );

    // Convert ETH amount to wei
    const amountInWei = ethers.parseEther(amountInEth);

    // Use a sample address for estimation (user's address would be used in actual transaction)
    const sampleAddress = '0x0000000000000000000000000000000000000001';
    
    // Estimate gas for deposit transaction
    // Using gas limit of 100000 for L2 execution
    const l2GasLimit = 100000;
    const isCreation = false;
    const data = '0x';

    const gasEstimate = await portalContract.depositTransaction.estimateGas(
      sampleAddress,
      amountInWei,
      l2GasLimit,
      isCreation,
      data,
      { value: amountInWei }
    );

    // Get current gas price on mainnet
    const feeData = await mainnetProvider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const maxFeePerGas = feeData.maxFeePerGas;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

    // Calculate gas costs
    const gasCostInWei = gasEstimate * gasPrice;
    const gasCostInEth = ethers.formatEther(gasCostInWei);

    // Calculate EIP-1559 gas cost
    let eip1559GasCost = null;
    let eip1559GasCostEth = null;
    if (maxFeePerGas && maxPriorityFeePerGas) {
      eip1559GasCost = gasEstimate * maxFeePerGas;
      eip1559GasCostEth = ethers.formatEther(eip1559GasCost);
    }

    // Get ETH price in USD (approximate - you may want to use a price oracle)
    const ethPriceUsd = await getEthPriceUsd();

    return {
      chain: 'Ethereum Mainnet',
      bridgeTo: 'Base L2',
      operation: 'Deposit ETH',
      amountToDeposit: amountInEth,
      gasEstimate: gasEstimate.toString(),
      gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
      gasCostWei: gasCostInWei.toString(),
      gasCostEth: gasCostInEth,
      gasCostUsd: (parseFloat(gasCostInEth) * ethPriceUsd).toFixed(2),
      eip1559: maxFeePerGas && maxPriorityFeePerGas ? {
        maxFeePerGas: ethers.formatUnits(maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, 'gwei'),
        gasCostWei: eip1559GasCost?.toString(),
        gasCostEth: eip1559GasCostEth,
        gasCostUsd: eip1559GasCostEth ? (parseFloat(eip1559GasCostEth) * ethPriceUsd).toFixed(2) : null
      } : null,
      l1Portal: BASE_OPTIMISM_PORTAL_ADDRESS,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate Base deposit gas fees: ${error.message}`);
  }
}

/**
 * Calculate gas fees for swapping ETH to USDC on Arbitrum using Uniswap V3
 * @param {string} amountInEth - Amount of ETH to swap (in ETH, e.g., "0.1")
 * @param {number} feeTier - Fee tier (500 for 0.05%, 3000 for 0.3%, 10000 for 1%)
 * @returns {Object} Gas fee estimates
 */
export async function calculateArbitrumSwapGasFees(amountInEth, feeTier = 3000) {
  try {
    const provider = getProvider('arbitrum');

    // Create SwapRouter contract instance
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_ADDRESSES.ARBITRUM,
      SWAP_ROUTER_ABI,
      provider
    );

    // Convert ETH amount to wei
    const amountInWei = ethers.parseEther(amountInEth);

    // Get WETH and USDC token addresses for Arbitrum
    const wethAddress = TOKENS.ARBITRUM.WETH.address;
    const usdcAddress = TOKENS.ARBITRUM.USDC.address;

    // Prepare swap parameters
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    const swapParams = {
      tokenIn: wethAddress,
      tokenOut: usdcAddress,
      fee: feeTier,
      recipient: ethers.ZeroAddress, // Dummy address for estimation
      deadline: deadline,
      amountIn: amountInWei,
      amountOutMinimum: 0, // Set to 0 for estimation
      sqrtPriceLimitX96: 0
    };

    // Estimate gas for swap transaction
    const gasEstimate = await swapRouter.exactInputSingle.estimateGas(
      swapParams,
      { value: amountInWei }
    );

    // Get current gas price and fee data
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const maxFeePerGas = feeData.maxFeePerGas;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

    // Calculate gas costs
    const gasCostInWei = gasEstimate * gasPrice;
    const gasCostInEth = ethers.formatEther(gasCostInWei);

    // Calculate EIP-1559 gas cost
    let eip1559GasCost = null;
    let eip1559GasCostEth = null;
    if (maxFeePerGas && maxPriorityFeePerGas) {
      eip1559GasCost = gasEstimate * maxFeePerGas;
      eip1559GasCostEth = ethers.formatEther(eip1559GasCost);
    }

    // Get ETH price in USD
    const ethPriceUsd = await getEthPriceUsd();

    // Get expected output amount using quoter
    const expectedOutput = await getExpectedSwapOutput(amountInEth, feeTier);

    return {
      chain: 'Arbitrum',
      operation: 'Swap ETH to USDC',
      protocol: 'Uniswap V3',
      amountIn: amountInEth,
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      feeTier: `${feeTier / 10000}%`,
      expectedOutput: expectedOutput,
      gasEstimate: gasEstimate.toString(),
      gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
      gasCostWei: gasCostInWei.toString(),
      gasCostEth: gasCostInEth,
      gasCostUsd: (parseFloat(gasCostInEth) * ethPriceUsd).toFixed(2),
      eip1559: maxFeePerGas && maxPriorityFeePerGas ? {
        maxFeePerGas: ethers.formatUnits(maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, 'gwei'),
        gasCostWei: eip1559GasCost?.toString(),
        gasCostEth: eip1559GasCostEth,
        gasCostUsd: eip1559GasCostEth ? (parseFloat(eip1559GasCostEth) * ethPriceUsd).toFixed(2) : null
      } : null,
      swapRouter: SWAP_ROUTER_ADDRESSES.ARBITRUM,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate Arbitrum swap gas fees: ${error.message}`);
  }
}

/**
 * Calculate gas fees for withdrawing ETH from Arbitrum to Ethereum mainnet
 * @param {string} amountInEth - Amount of ETH to withdraw (in ETH, e.g., "0.1")
 * @returns {Object} Gas fee estimates
 */
export async function calculateArbitrumWithdrawGasFees(amountInEth) {
  try {
    const provider = getProvider('arbitrum');

    // ArbSys ABI for withdrawals
    const ARBSYS_ABI = [
      'function withdrawEth(address destination) external payable returns (uint256)'
    ];

    // ArbSys precompile address (used for L2 to L1 messages)
    const ARBSYS_ADDRESS = '0x0000000000000000000000000000000000000064';

    const arbSys = new ethers.Contract(
      ARBSYS_ADDRESS,
      ARBSYS_ABI,
      provider
    );

    // Convert ETH amount to wei
    const amountInWei = ethers.parseEther(amountInEth);

    // Use a sample address for estimation (user's address would be used in actual transaction)
    const sampleAddress = '0x0000000000000000000000000000000000000001';

    // Estimate gas for withdrawal transaction
    const gasEstimate = await arbSys.withdrawEth.estimateGas(
      sampleAddress, // Sample destination for estimation
      { value: amountInWei }
    );

    // Get current gas price and fee data
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const maxFeePerGas = feeData.maxFeePerGas;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

    // Calculate gas costs
    const gasCostInWei = gasEstimate * gasPrice;
    const gasCostInEth = ethers.formatEther(gasCostInWei);

    // Calculate EIP-1559 gas cost
    let eip1559GasCost = null;
    let eip1559GasCostEth = null;
    if (maxFeePerGas && maxPriorityFeePerGas) {
      eip1559GasCost = gasEstimate * maxFeePerGas;
      eip1559GasCostEth = ethers.formatEther(eip1559GasCost);
    }

    // Get ETH price in USD
    const ethPriceUsd = await getEthPriceUsd();

    return {
      chain: 'Arbitrum',
      bridgeTo: 'Ethereum Mainnet',
      operation: 'Withdraw ETH',
      amountToWithdraw: amountInEth,
      gasEstimate: gasEstimate.toString(),
      gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
      gasCostWei: gasCostInWei.toString(),
      gasCostEth: gasCostInEth,
      gasCostUsd: (parseFloat(gasCostInEth) * ethPriceUsd).toFixed(2),
      eip1559: maxFeePerGas && maxPriorityFeePerGas ? {
        maxFeePerGas: ethers.formatUnits(maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, 'gwei'),
        gasCostWei: eip1559GasCost?.toString(),
        gasCostEth: eip1559GasCostEth,
        gasCostUsd: eip1559GasCostEth ? (parseFloat(eip1559GasCostEth) * ethPriceUsd).toFixed(2) : null
      } : null,
      arbSysAddress: ARBSYS_ADDRESS,
      note: 'L1 gas cost for finalizing withdrawal on mainnet not included. Typical L1 finalization cost: 0.001-0.003 ETH',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate Arbitrum withdraw gas fees: ${error.message}`);
  }
}

/**
 * Get expected swap output using Uniswap V3 Quoter
 * @param {string} amountInEth - Amount of ETH to swap
 * @param {number} feeTier - Fee tier
 * @returns {string} Expected USDC output
 */
async function getExpectedSwapOutput(amountInEth, feeTier) {
  try {
    const provider = getProvider('arbitrum');

    // Quoter V2 ABI
    const QUOTER_V2_ABI = [
      'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
    ];

    const QUOTER_V2_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';

    const quoter = new ethers.Contract(
      QUOTER_V2_ADDRESS,
      QUOTER_V2_ABI,
      provider
    );

    const amountInWei = ethers.parseEther(amountInEth);
    const wethAddress = TOKENS.ARBITRUM.WETH.address;
    const usdcAddress = TOKENS.ARBITRUM.USDC.address;

    const quoteParams = {
      tokenIn: wethAddress,
      tokenOut: usdcAddress,
      amountIn: amountInWei,
      fee: feeTier,
      sqrtPriceLimitX96: 0
    };

    // Use static call since quoter functions are not view functions
    const result = await quoter.quoteExactInputSingle.staticCall(quoteParams);
    
    // USDC has 6 decimals
    const amountOut = ethers.formatUnits(result[0], 6);
    
    return `${amountOut} USDC`;
  } catch (error) {
    return 'Unable to fetch quote';
  }
}

/**
 * Get ETH price in USD (using Uniswap V3 as oracle)
 * @returns {number} ETH price in USD
 */
async function getEthPriceUsd() {
  try {
    const provider = getProvider('arbitrum');

    // Pool ABI for getting price
    const POOL_ABI = [
      'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
    ];

    // ETH/USDC pool on Arbitrum (0.05% fee tier)
    const ETH_USDC_POOL = '0xC6962004f452bE9203591991D15f6b388e09E8D0';

    const pool = new ethers.Contract(ETH_USDC_POOL, POOL_ABI, provider);
    const slot0 = await pool.slot0();
    const sqrtPriceX96 = slot0[0];

    // Calculate price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96)^2 * (10^(token1Decimals - token0Decimals))
    const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
    const price = sqrtPrice ** 2;

    // WETH is token0, USDC is token1, so we need to invert and adjust for decimals
    // WETH has 18 decimals, USDC has 6 decimals
    const ethPrice = price * (10 ** 12); // 10^(6-18) = 10^-12, so multiply by 10^12

    return ethPrice;
  } catch (error) {
    // Fallback to approximate price if oracle fails
    console.error('Failed to fetch ETH price from Uniswap:', error.message);
    return 3500; // Approximate fallback
  }
}

/**
 * Calculate total gas fees for a complete flow: deposit to Base, bridge to Arbitrum, and swap ETH to USDC
 * @param {string} amountInEth - Amount of ETH for the flow
 * @param {number} feeTier - Fee tier for swap (default 3000)
 * @returns {Object} Combined gas fee estimates
 */
export async function calculateCompleteFlowGasFees(amountInEth, feeTier = 3000) {
  try {
    const [depositFees, swapFees] = await Promise.all([
      calculateBaseDepositGasFees(amountInEth),
      calculateArbitrumSwapGasFees(amountInEth, feeTier)
    ]);

    const totalGasCostEth = (
      parseFloat(depositFees.gasCostEth) +
      parseFloat(swapFees.gasCostEth)
    ).toFixed(6);

    const totalGasCostUsd = (
      parseFloat(depositFees.gasCostUsd) +
      parseFloat(swapFees.gasCostUsd)
    ).toFixed(2);

    return {
      flow: 'Deposit ETH to Base → Bridge to Arbitrum → Swap to USDC',
      amountInEth,
      steps: {
        step1_deposit: depositFees,
        step2_swap: swapFees
      },
      totalGasCostEth,
      totalGasCostUsd,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate complete flow gas fees: ${error.message}`);
  }
}

/**
 * Calculate bridge fees for ETH from Base to Arbitrum using Across Protocol
 * @param {string} amountInEth - Amount of ETH to bridge (in ETH, e.g., "0.1")
 * @returns {Object} Bridge fee estimates including relayer fees and gas costs
 */
export async function calculateAcrossBridgeFees(amountInEth) {
  try {
    const baseProvider = getProvider('base');
    
    // Across Protocol SpokePool address on Base
    const BASE_SPOKE_POOL = '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64';
    const ARBITRUM_CHAIN_ID = 42161;
    const BASE_CHAIN_ID = 8453;
    
    // Fetch suggested fees from Across API
    const amountInWei = ethers.parseEther(amountInEth);
    
    // Native ETH address used by Across (zero address)
    const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
    
    // Across API endpoint for suggested fees
    const acrossApiUrl = `https://app.across.to/api/suggested-fees?token=${ETH_ADDRESS}&destinationChainId=${ARBITRUM_CHAIN_ID}&amount=${amountInWei.toString()}&originChainId=${BASE_CHAIN_ID}`;
    
    let relayerFeeBps = 10; // Default 0.1% if API fails
    let totalRelayerFeeWei = (amountInWei * BigInt(relayerFeeBps)) / BigInt(10000);
    
    try {
      const response = await fetch(acrossApiUrl);
      if (response.ok) {
        const feeData = await response.json();
        // Across API returns totalRelayFee in wei
        if (feeData.totalRelayFee) {
          totalRelayerFeeWei = BigInt(feeData.totalRelayFee.total);
          // Calculate percentage
          relayerFeeBps = Number((totalRelayerFeeWei * BigInt(10000)) / amountInWei);
        }
      } else {
        console.log('Across API unavailable, using default relayer fee');
      }
    } catch (apiError) {
      console.log('Across API unavailable, using default relayer fee:', apiError.message);
    }
    
    // Calculate output amount after relayer fees
    const outputAmount = amountInWei - totalRelayerFeeWei;
    
    // Estimate gas using a simpler approach - check current gas price and estimate typical gas usage
    // Across Protocol deposits typically use 200,000 - 300,000 gas on Base
    const typicalGasUsage = BigInt(250000); // Typical gas for Across bridge transaction
    
    // Get current gas price on Base
    const feeData = await baseProvider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const maxFeePerGas = feeData.maxFeePerGas;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    
    // Calculate gas costs
    const gasCostInWei = typicalGasUsage * gasPrice;
    const gasCostInEth = ethers.formatEther(gasCostInWei);
    
    // Calculate EIP-1559 gas cost
    let eip1559GasCost = null;
    let eip1559GasCostEth = null;
    if (maxFeePerGas && maxPriorityFeePerGas) {
      eip1559GasCost = typicalGasUsage * maxFeePerGas;
      eip1559GasCostEth = ethers.formatEther(eip1559GasCost);
    }
    
    // Get ETH price for USD conversion
    const ethPriceUsd = await getEthPriceUsd();
    
    // Calculate relayer fees
    const relayerFeeEth = ethers.formatEther(totalRelayerFeeWei);
    const relayerFeeUsd = (parseFloat(relayerFeeEth) * ethPriceUsd).toFixed(2);
    
    // Calculate total fees (gas + relayer fees)
    const totalFeesEth = (parseFloat(gasCostInEth) + parseFloat(relayerFeeEth)).toFixed(6);
    const totalFeesUsd = (parseFloat(totalFeesEth) * ethPriceUsd).toFixed(2);
    
    // Calculate received amount
    const receivedAmountEth = ethers.formatEther(outputAmount);
    const gasCostUsd = (parseFloat(gasCostInEth) * ethPriceUsd).toFixed(2);
    
    return {
      protocol: 'Across Protocol',
      bridge: 'Base → Arbitrum',
      inputAmount: amountInEth,
      outputAmount: receivedAmountEth,
      fees: {
        relayerFee: {
          percentage: `${(relayerFeeBps / 100).toFixed(2)}%`,
          amountEth: relayerFeeEth,
          amountUsd: relayerFeeUsd,
          source: 'Across API'
        },
        gasFee: {
          chain: 'Base',
          gasEstimate: typicalGasUsage.toString(),
          gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
          gasCostWei: gasCostInWei.toString(),
          gasCostEth: gasCostInEth,
          gasCostUsd: gasCostUsd,
          eip1559: maxFeePerGas && maxPriorityFeePerGas ? {
            maxFeePerGas: ethers.formatUnits(maxFeePerGas, 'gwei'),
            maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, 'gwei'),
            gasCostWei: eip1559GasCost?.toString(),
            gasCostEth: eip1559GasCostEth,
            gasCostUsd: eip1559GasCostEth ? (parseFloat(eip1559GasCostEth) * ethPriceUsd).toFixed(2) : null
          } : null
        },
        totalFees: {
          eth: totalFeesEth,
          usd: totalFeesUsd
        }
      },
      contracts: {
        baseSpokePool: BASE_SPOKE_POOL,
        inputToken: 'ETH (Native)'
      },
      estimatedTime: '2-4 minutes',
      destinationChainId: ARBITRUM_CHAIN_ID,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate Across bridge fees: ${error.message}`);
  }
}

/**
 * Calculate bridge slippage for ETH from Base to Arbitrum using Across Protocol
 * @param {string} amountInEth - Amount of ETH to bridge (in ETH, e.g., "0.1")
 * @returns {Object} Slippage analysis including LP fees, relayer fees, and total slippage
 */
export async function calculateAcrossBridgeSlippage(amountInEth) {
  try {
    const amountInWei = ethers.parseEther(amountInEth);
    const BASE_CHAIN_ID = 8453;
    const ARBITRUM_CHAIN_ID = 42161;
    
    // Native ETH address used by Across
    const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
    
    // Fetch limits to get available routes
    const limitsUrl = `https://app.across.to/api/limits?token=${ETH_ADDRESS}&originChainId=${BASE_CHAIN_ID}&destinationChainId=${ARBITRUM_CHAIN_ID}`;
    
    let limitsResponse;
    try {
      limitsResponse = await fetch(limitsUrl);
      if (!limitsResponse.ok) {
        throw new Error(`Limits API returned status ${limitsResponse.status}`);
      }
    } catch (error) {
      console.log('Limits API unavailable:', error.message);
    }
    
    // Fetch suggested fees from Across API
    const acrossApiUrl = `https://app.across.to/api/suggested-fees?token=${ETH_ADDRESS}&destinationChainId=${ARBITRUM_CHAIN_ID}&amount=${amountInWei.toString()}&originChainId=${BASE_CHAIN_ID}`;
    
    const response = await fetch(acrossApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Across API returned status ${response.status}: ${errorText}`);
    }
    
    const feeData = await response.json();
    
    // Extract fee components from Across API response
    const totalRelayFeeWei = BigInt(feeData.totalRelayFee?.total || '0');
    const lpFeeWei = BigInt(feeData.totalRelayFee?.pct || '0');
    const relayerGasFeeWei = BigInt(feeData.relayerGasFee?.total || '0');
    const relayerCapitalFeeWei = BigInt(feeData.relayerCapitalFee?.total || '0');
    
    // Calculate output amount
    const outputAmountWei = amountInWei - totalRelayFeeWei;
    
    // Calculate slippage percentage
    const totalSlippageBps = (totalRelayFeeWei * BigInt(10000)) / amountInWei;
    const lpFeeBps = (lpFeeWei * BigInt(10000)) / amountInWei;
    const relayerGasFeeBps = (relayerGasFeeWei * BigInt(10000)) / amountInWei;
    const relayerCapitalFeeBps = (relayerCapitalFeeWei * BigInt(10000)) / amountInWei;
    
    // Get ETH price for USD conversion
    const ethPriceUsd = await getEthPriceUsd();
    
    // Format values
    const inputAmountEth = ethers.formatEther(amountInWei);
    const outputAmountEth = ethers.formatEther(outputAmountWei);
    const totalFeesEth = ethers.formatEther(totalRelayFeeWei);
    const lpFeeEth = ethers.formatEther(lpFeeWei);
    const relayerGasFeeEth = ethers.formatEther(relayerGasFeeWei);
    const relayerCapitalFeeEth = ethers.formatEther(relayerCapitalFeeWei);
    
    // Calculate USD values
    const inputAmountUsd = (parseFloat(inputAmountEth) * ethPriceUsd).toFixed(2);
    const outputAmountUsd = (parseFloat(outputAmountEth) * ethPriceUsd).toFixed(2);
    const totalFeesUsd = (parseFloat(totalFeesEth) * ethPriceUsd).toFixed(2);
    const lpFeeUsd = (parseFloat(lpFeeEth) * ethPriceUsd).toFixed(2);
    const relayerGasFeeUsd = (parseFloat(relayerGasFeeEth) * ethPriceUsd).toFixed(2);
    const relayerCapitalFeeUsd = (parseFloat(relayerCapitalFeeEth) * ethPriceUsd).toFixed(2);
    
    return {
      protocol: 'Across Protocol',
      bridge: 'Base → Arbitrum',
      inputAmount: {
        eth: inputAmountEth,
        usd: inputAmountUsd
      },
      expectedOutputAmount: {
        eth: outputAmountEth,
        usd: outputAmountUsd
      },
      slippage: {
        total: {
          percentage: `${(Number(totalSlippageBps) / 100).toFixed(4)}%`,
          basisPoints: totalSlippageBps.toString(),
          amountEth: totalFeesEth,
          amountUsd: totalFeesUsd
        },
        breakdown: {
          lpFee: {
            percentage: `${(Number(lpFeeBps) / 100).toFixed(4)}%`,
            basisPoints: lpFeeBps.toString(),
            amountEth: lpFeeEth,
            amountUsd: lpFeeUsd,
            description: 'Liquidity Provider fee for providing capital'
          },
          relayerGasFee: {
            percentage: `${(Number(relayerGasFeeBps) / 100).toFixed(4)}%`,
            basisPoints: relayerGasFeeBps.toString(),
            amountEth: relayerGasFeeEth,
            amountUsd: relayerGasFeeUsd,
            description: 'Relayer gas cost on destination chain'
          },
          relayerCapitalFee: {
            percentage: `${(Number(relayerCapitalFeeBps) / 100).toFixed(4)}%`,
            basisPoints: relayerCapitalFeeBps.toString(),
            amountEth: relayerCapitalFeeEth,
            amountUsd: relayerCapitalFeeUsd,
            description: 'Relayer capital cost for fronting funds'
          }
        }
      },
      priceImpact: {
        description: 'Minimal - Across uses oracle prices, not AMM pricing',
        percentage: '0.00%'
      },
      estimatedTime: '2-4 minutes',
      dataSource: 'Across Protocol API (Real-time)',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate Across bridge slippage: ${error.message}`);
  }
}
