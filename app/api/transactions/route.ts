import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ARBITRAGE_EXECUTOR_ABI } from '@/lib/contract-abi';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ARBITRAGE_EXECUTOR_ADDRESS || "0xafB0Ba6B093C8e411c27F79C12d68A54A54c8F42";
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Validate address
    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      );
    }

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ARBITRAGE_EXECUTOR_ABI, provider);

    // Fetch user transactions
    const transactions = await contract.getUserTransactions(userAddress);
    
    // Format transactions
    const formattedTransactions = transactions.map((tx: any) => ({
      timestamp: Number(tx.timestamp),
      amountIn: ethers.formatEther(tx.amountIn),
      profit: ethers.formatEther(tx.profit),
      isExecuteArb: tx.isExecuteArb,
      date: new Date(Number(tx.timestamp) * 1000).toISOString(),
    }));

    // Calculate total profit
    const totalProfit = transactions.reduce((sum: bigint, tx: any) => {
      return sum + tx.profit;
    }, BigInt(0));

    return NextResponse.json({
      success: true,
      userAddress,
      transactions: formattedTransactions,
      totalTransactions: formattedTransactions.length,
      totalProfit: ethers.formatEther(totalProfit),
      totalProfitWei: totalProfit.toString(),
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transactions',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
