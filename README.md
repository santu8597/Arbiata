# Arbiata- Execution-Aware DeFi Arbitrage

Arbfarm is a non-custodial arbitrage executor that enforces profitability on-chain. Unlike traditional arbitrage bots that predict profits, Arbfarm guarantees them—any unprofitable trade reverts, preserving your capital.

# The Problem It Solves

Arbitrage trading in DeFi is fundamentally broken. Most arbitrage bots and tools make a critical mistake: they chase theoretical price differences without accounting for the brutal reality of execution costs. A bot might detect that ETH costs $2,100 on one DEX and $2,103 on another, calculate a $3 profit, and execute the trade—only to lose $5 after accounting for gas fees, slippage, and MEV attacks.

The root problem is that these systems conflate **detection** with **execution**. They assume that because an opportunity exists in theory, it will be profitable in practice. This leads to:

- Lost capital from unprofitable trades that looked good on paper
- Wasted gas fees on reverted transactions
- MEV bot sandwich attacks eating into profits
- Slippage in low-liquidity pools destroying margins
- No accountability when trades fail

Arbfarm solves this by inverting the entire model. Instead of predicting profits, we **enforce** them on-chain. The smart contract includes a simple but powerful invariant:

```solidity
uint256 profit = ethAfter - ethBefore;
require(profit >= minProfit, "Trade not profitable");
```

If this check fails, the entire transaction reverts. Your principal is preserved, and you only pay the cost of a failed transaction (typically under $0.10 on Layer 2 networks).

But enforcement alone isn't enough. We need to avoid attempting unprofitable trades in the first place. This is where our AI layer comes in—not to predict prices, but to act as a **risk filter**. The AI receives deterministic simulation data (gas costs, slippage estimates, fee breakdowns) and makes a binary decision: EXECUTE or SKIP.

## What People Can Use It For

**Learning Arbitrage Safely**: New traders can experiment with real arbitrage strategies on testnet without risking actual funds. The simulation mode lets you see what profit or loss would have occurred without executing real swaps.

**Capital-Efficient Trading**: Unlike traditional arbitrage bots that require large capital to overcome fees, Arbfarm's risk filtering means you only execute when conditions are genuinely favorable. This makes smaller trades viable.

**Transparent Decision-Making**: Every decision is explained. If the AI skips a trade, you see exactly why—high gas costs, insufficient liquidity, MEV risk. This builds intuition about what makes trades profitable.

**Non-Custodial Execution**: Your funds never leave your wallet until you explicitly sign a transaction. No deposits to centralized exchanges, no trust in third-party custodians. The smart contract holds your deposited ETH per-user, and you can withdraw at any time.

**Testnet-First Development**: The entire system runs on Base Sepolia and Arbitrum Sepolia, allowing developers to fork the codebase and experiment with modifications without mainnet risk.

## Architecture

The system has four layers:

**Smart Contract Layer** (`contracts/ArbitrageExecutor.sol`)  
A single-file Solidity contract that manages user deposits, executes ETH/USDC arbitrage via Uniswap V3, and enforces the profit invariant. If `profit < minProfit`, the transaction reverts. Deployed on Base Sepolia at `0x03A159be72A53176480Ab1408f6a1497844990cE`.

**Frontend Layer** (`app/`)  
Next.js 14 application with RainbowKit wallet integration. Users connect their wallet, deposit ETH, view live price spreads, simulate trades, and execute arbitrage. The UI is built with Tailwind CSS using a dark glassmorphic theme.

**API Layer** (`app/api/`)  
Four main endpoints:
- `/api/prices-live` - Fetches ETH/USDC prices from Uniswap V3 pools
- `/api/detect` - Identifies arbitrage opportunities by comparing cross-chain prices
- `/api/simulate` - Calculates gas costs, slippage, fees, and net profit
- `/api/decide` - AI risk filter that returns EXECUTE or SKIP

**AI Layer** (`lib/ai/gemini.ts`)  
Google Gemini 1.5 Flash integration that acts as a risk classifier. It receives deterministic simulation data and evaluates whether execution conditions are favorable. The AI doesn't predict prices—it assesses whether current conditions (gas costs, slippage, MEV risk) justify execution.

## Core Innovation

Traditional arbitrage flow:
```
Detect opportunity → Execute trade → Hope for profit
```

Arbfarm flow:
```
Detect opportunity → Simulate execution → AI risk filter → Execute only if safe → Enforce profit on-chain
```

The key difference: multiple rejection layers before capital is at risk. Most trades get filtered out in simulation or by AI decision. Only high-confidence trades reach the blockchain.

The contract enforces this via:

```solidity
function executeArb(uint256 amountIn, uint256 minProfit) external {
    uint256 ethBefore = address(this).balance;
    
    // Execute: ETH → WETH → USDC → WETH → ETH
    // ... swap logic ...
    
    uint256 ethAfter = address(this).balance;
    uint256 profit = ethAfter - ethBefore;
    
    require(profit >= minProfit, "Insufficient profit");
    
    userBalances[msg.sender] += profit;
}
```

If the profit check fails, Solidity reverts the entire transaction. User funds return to their balance unchanged.

## Technical Stack

**Smart Contracts**: Solidity 0.8.20, Hardhat  
**Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS  
**Wallet**: RainbowKit, wagmi, viem  
**DEX Integration**: Uniswap V3 (SwapRouter02, Quoter V2)  
**AI**: Google Gemini 1.5 Flash via Generative AI SDK  
**Networks**: Base Sepolia (84532), Arbitrum Sepolia (421614)  

## User Flow

1. **Connect Wallet**: Click "Connect Wallet" in navbar, select MetaMask/WalletConnect
2. **Switch Network**: Frontend prompts to switch to Base Sepolia (chainId: 84532)
3. **Deposit ETH**: Enter amount (minimum $1 USD equivalent), sign transaction
4. **View Opportunities**: Dashboard shows live ETH/USDC prices across chains
5. **Simulate Trade**: System calculates gas, slippage, fees, and net profit
6. **AI Decision**: Gemini evaluates risk and returns EXECUTE or SKIP with reasoning
7. **Execute Arbitrage**: If AI approves, user signs execution transaction
8. **View Results**: Profit added to balance, transaction recorded on-chain
9. **Withdraw**: Partial or full withdrawal at any time

## Smart Contract Functions

**User Functions**

`deposit() payable`  
Deposits native ETH into the contract, credited to `userBalances[msg.sender]`.

`withdraw(uint256 amount)`  
Withdraws specified amount from user balance back to their wallet.

`executeArb(uint256 amountIn, uint256 minProfit)`  
Executes ETH → USDC → ETH arbitrage. Reverts if `profit < minProfit`.

`getUserBalance(address user) returns (uint256)`  
Returns the deposited balance for a specific user.

`getUserTransactions(address user) returns (Transaction[])`  
Returns array of all arbitrage transactions for a user (timestamp, amountIn, profit).

**View Functions**

`getContractBalance() returns (uint256)`  
Total ETH held by contract across all users.

`WETH() returns (address)`  
Address of WETH token on current chain.

`USDC() returns (address)`  
Address of USDC token on current chain.


## Future Enhancements

**Multi-DEX Support**: Currently hardcoded to Uniswap V3. Could extend to SushiSwap, Curve, Balancer for more opportunities.

**Flash Loan Integration**: Eliminate need for deposited capital by using Aave/dYdX flash loans for execution capital.

**Historical Analytics**: Track success rate, average profit per trade, gas efficiency over time.

**Mobile App**: React Native version for on-the-go monitoring and execution.

**Mainnet Deployment**: Current contract is production-ready but untested on mainnet. Would need thorough auditing before handling real value.

## Contract Addresses

**Base Sepolia**: `0x03A159be72A53176480Ab1408f6a1497844990cE`  
**Arbitrum Sepolia**: `0xe72442D80Fb85CDB85Cc9B197B25055aB79712dA`

## License

MIT License - see LICENSE file for details.
