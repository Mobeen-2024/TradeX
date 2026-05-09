import { CandlestickData, Time } from 'lightweight-charts';

export interface IndicatorData {
    time: Time;
    value: number;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: CandlestickData[], period: number): IndicatorData[] {
    const k = 2 / (period + 1);
    let ema: number[] = [];
    const result: IndicatorData[] = [];

    data.forEach((d, i) => {
        const val = d.close;
        if (i === 0) {
            ema[i] = val;
        } else {
            ema[i] = val * k + ema[i - 1] * (1 - k);
        }

        if (i >= period - 1) {
            result.push({
                time: d.time,
                value: parseFloat(ema[i].toFixed(2))
            });
        }
    });

    return result;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(data: CandlestickData[], period: number): IndicatorData[] {
    const result: IndicatorData[] = [];
    if (data.length <= period) return result;

    let gains = 0;
    let losses = 0;

    // Initial SMA of gains and losses
    for (let i = 1; i <= period; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        const currentGain = diff >= 0 ? diff : 0;
        const currentLoss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        result.push({
            time: data[i].time,
            value: parseFloat(rsi.toFixed(2))
        });
    }

    return result;
}

/**
 * Calculates Bollinger Bands
 */
export function calculateBollingerBands(data: CandlestickData[], period: number, stdDev: number = 2) {
    const upper: IndicatorData[] = [];
    const middle: IndicatorData[] = [];
    const lower: IndicatorData[] = [];

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, d) => acc + d.close, 0);
        const avg = sum / period;

        const squareDiffs = slice.map(d => Math.pow(d.close - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((acc, d) => acc + d, 0) / period;
        const sd = Math.sqrt(avgSquareDiff);

        middle.push({ time: data[i].time, value: parseFloat(avg.toFixed(2)) });
        upper.push({ time: data[i].time, value: parseFloat((avg + stdDev * sd).toFixed(2)) });
        lower.push({ time: data[i].time, value: parseFloat((avg - stdDev * sd).toFixed(2)) });
    }

    return { upper, middle, lower };
}

/**
 * Calculates MACD
 */
export function calculateMACD(data: CandlestickData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const macdSeries: IndicatorData[] = [];
    const signalSeries: IndicatorData[] = [];
    const histogramSeries: IndicatorData[] = [];

    if (data.length <= slowPeriod) return { macdSeries, signalSeries, histogramSeries };

    const fastEma = calculateEMA(data, fastPeriod);
    const slowEma = calculateEMA(data, slowPeriod);

    const fastMap = new Map();
    fastEma.forEach(d => fastMap.set(d.time, d.value));

    const macdDataRaw: CandlestickData[] = [];

    slowEma.forEach(slowD => {
        const fastVal = fastMap.get(slowD.time);
        if (fastVal !== undefined) {
            const macdDiff = fastVal - slowD.value;
            macdSeries.push({ time: slowD.time, value: parseFloat(macdDiff.toFixed(4)) });
            macdDataRaw.push({ time: slowD.time, close: macdDiff } as any);
        }
    });

    const signalData = calculateEMA(macdDataRaw, signalPeriod);
    const signalMap = new Map();
    signalData.forEach(d => signalMap.set(d.time, d.value));

    macdSeries.forEach(macd => {
        const sigVal = signalMap.get(macd.time);
        if (sigVal !== undefined) {
            signalSeries.push({ time: macd.time, value: sigVal });
            histogramSeries.push({
                time: macd.time,
                value: parseFloat((macd.value - sigVal).toFixed(4))
            });
        }
    });

    const validTimes = new Set(histogramSeries.map(d => d.time as number | string));
    const finalMacd = macdSeries.filter(d => validTimes.has(d.time as number | string));

    return {
        macd: finalMacd,
        signal: signalSeries,
        histogram: histogramSeries
    };
}
