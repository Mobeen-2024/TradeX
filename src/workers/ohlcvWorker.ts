/**
 * workers/ohlcvWorker.ts
 *
 * Off-main-thread computation for institutional indicators (EMA, RSI, Bollinger Bands).
 * This prevents UI micro-stutters during heavy candle history processing.
 */

import { calculateEMA, calculateRSI, calculateBollingerBands, calculateMACD } from '../utils/indicators.ts';

self.onmessage = (e: MessageEvent) => {
  const { type, candles, config, requestId } = e.data;

  if (type === 'compute_indicators') {
    const result: any = { requestId };

    try {
      if (config.ema) {
        result.ema = calculateEMA(candles, config.emaPeriod || 21);
      }

      if (config.rsi) {
        result.rsi = calculateRSI(candles, config.rsiPeriod || 14);
      }

      if (config.bollinger) {
        const { upper, middle, lower } = calculateBollingerBands(candles, config.bbPeriod || 20);
        result.bollinger = { upper, middle, lower };
      }

      if (config.macd) {
        const { macd, signal, histogram } = calculateMACD(candles, config.macdFast || 12, config.macdSlow || 26, config.macdSignal || 9);
        result.macd = { macd, signal, histogram };
      }

      self.postMessage({ type: 'indicators_ready', ...result });
    } catch (err: any) {
      self.postMessage({ type: 'error', message: err.message, requestId });
    }
  }
};

