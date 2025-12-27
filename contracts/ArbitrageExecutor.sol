// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}

contract Arbfarm {

    ISwapRouter public immutable swapRouter;
    address public immutable WETH;
    address public immutable USDC;
    
    uint24 public constant POOL_FEE = 3000;
    
    mapping(address => uint256) public userBalances;
    
    struct Transaction {
        uint256 timestamp;
        uint256 amountIn;
        uint256 profit;
        bool isExecuteArb;
    }
    
    mapping(address => Transaction[]) private userTransactions;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event ArbitrageExecuted(
        address indexed user,
        uint256 ethBefore,
        uint256 ethAfter,
        uint256 profit
    );

    constructor(
        address _swapRouter,
        address _weth,
        address _usdc
    ) {
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _weth;
        USDC = _usdc;
    }

    receive() external payable {
        userBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        userBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero withdraw");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");

        userBalances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    function executeArb(
        uint256 amountIn,
        uint256 minProfit
    ) external {
        require(amountIn > 0, "Zero amount");
        require(userBalances[msg.sender] >= amountIn, "Insufficient balance");
        
        uint256 ethBefore = address(this).balance;

        // Deduct from user balance
        userBalances[msg.sender] -= amountIn;

        IWETH(WETH).deposit{value: amountIn}();
        IWETH(WETH).approve(address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory wethToUsdc =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: USDC,
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: amountIn,
                amountOutMinimum: 0, 
                sqrtPriceLimitX96: 0
            });

        uint256 usdcReceived = swapRouter.exactInputSingle(wethToUsdc);
        require(usdcReceived > 0, "WETH->USDC swap failed");


        IERC20(USDC).approve(address(swapRouter), usdcReceived);

        ISwapRouter.ExactInputSingleParams memory usdcToWeth =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: USDC,
                tokenOut: WETH,
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: usdcReceived,
                amountOutMinimum: 0, 
                sqrtPriceLimitX96: 0
            });

        uint256 wethReceived = swapRouter.exactInputSingle(usdcToWeth);
        require(wethReceived > 0, "USDC->WETH swap failed");

        IWETH(WETH).withdraw(wethReceived);

        uint256 ethAfter = address(this).balance;
        uint256 profit = ethAfter - ethBefore;

        require(
            profit >= minProfit,
            "Unprofitable: profit below minimum"
        );

        userBalances[msg.sender] += amountIn + profit;
        
        userTransactions[msg.sender].push(Transaction({
            timestamp: block.timestamp,
            amountIn: amountIn,
            profit: profit,
            isExecuteArb: true
        }));

        emit ArbitrageExecuted(
            msg.sender,
            ethBefore,
            ethAfter,
            profit
        );
    }

    function executeArbitrageFlexible(
        address tokenIn,
        address tokenOut,
        uint24 feeBuy,
        uint24 feeSell,
        uint256 amountIn,
        uint256 minAmountOutBuy,
        uint256 minAmountOutSell
    ) external {
        require(amountIn > 0, "Zero amount");
        require(userBalances[msg.sender] >= amountIn, "Insufficient balance");
        
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));

        userBalances[msg.sender] -= amountIn;

        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        uint256 tokenOutAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeBuy,
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: amountIn,
                amountOutMinimum: minAmountOutBuy,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(tokenOut).approve(address(swapRouter), tokenOutAmount);
        
        swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: tokenIn,
                fee: feeSell,
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: tokenOutAmount,
                amountOutMinimum: minAmountOutSell,
                sqrtPriceLimitX96: 0
            })
        );

        uint256 balanceAfter = IERC20(tokenIn).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "NO_PROFIT");

        uint256 profit = balanceAfter - balanceBefore;
        
        userBalances[msg.sender] += amountIn + profit;
        
        userTransactions[msg.sender].push(Transaction({
            timestamp: block.timestamp,
            amountIn: amountIn,
            profit: profit,
            isExecuteArb: false
        }));

        emit ArbitrageExecuted(msg.sender, balanceBefore, balanceAfter, profit);
    }
    
    function getUserTransactions(address user) external view returns (Transaction[] memory) {
        return userTransactions[user];
    }
    
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
}