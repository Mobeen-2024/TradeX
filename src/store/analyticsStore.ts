import { computed } from 'vue';
import { closedTrades, availableUsdt } from './tradeStore';

export const analyticsData = computed(() => {
    const trades = closedTrades.value;
    if (trades.length === 0) {
        return {
            winRate: 0,
            profitFactor: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            totalNetProfit: 0,
            equityCurve: []
        };
    }

    let netProfit = 0;
    let winningTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let currentEquity = 10000; // Starting base for equity curve
    const equityCurve: { time: number; value: number }[] = [];
    
    // Initial point
    equityCurve.push({ time: trades[0].closeTime / 1000 - 3600, value: currentEquity });

    let peak = currentEquity;
    let maxDrawdown = 0;
    const returns: number[] = [];

    trades.sort((a, b) => a.closeTime - b.closeTime).forEach(trade => {
        const pnl = trade.realizedPnl;
        netProfit += pnl;
        returns.push(pnl);

        if (pnl > 0) {
            winningTrades++;
            grossProfit += pnl;
        } else {
            grossLoss += Math.abs(pnl);
        }

        currentEquity += pnl;
        equityCurve.push({ time: trade.closeTime / 1000, value: currentEquity });

        if (currentEquity > peak) peak = currentEquity;
        const dd = (peak - currentEquity) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const winRate = (winningTrades / trades.length) * 100;
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    // Sharpe Ratio Calculation
    const avgReturn = netProfit / trades.length;
    const stdDev = Math.sqrt(
        returns.reduce((acc, val) => acc + Math.pow(val - avgReturn, 2), 0) / trades.length
    );
    const sharpeRatio = stdDev === 0 ? 0 : avgReturn / stdDev;

    return {
        winRate,
        profitFactor,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio,
        totalNetProfit: netProfit,
        equityCurve
    };
});
