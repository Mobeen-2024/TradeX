import type { NodePlugin } from '../types';
import RsiNode from '../../nodes/RsiNode.vue';

/**
 * Example of our new Smart Node Architecture Plugin.
 * This separates UI from logic and schema.
 */
export const RsiNodePlugin: NodePlugin = {
  type: 'rsi_smart',
  name: 'Smart RSI',
  category: 'Indicators',
  schema: {
    period: { type: 'number', label: 'Period', default: 14 },
    overbought: { type: 'number', label: 'Overbought Level', default: 70 },
    oversold: { type: 'number', label: 'Oversold Level', default: 30 },
    source: { type: 'enum', label: 'Source', options: [{ value: 'close', label: 'Close' }, { value: 'open', label: 'Open' }], default: 'close' }
  },
  inputs: [
    { id: 'price', name: 'Price Feed', type: 'OHLCV' }
  ],
  outputs: [
    { id: 'value', name: 'RSI Value', type: 'number' },
    { id: 'signal', name: 'Signal', type: 'string' } // 'BUY', 'SELL', 'NEUTRAL'
  ],
  renderer: RsiNode,
  executor: (context, data, inputs) => {
    // Engine logic here
    const { period, overbought, oversold } = data;
    // Calculate RSI...
    const value = 42; // mock
    return {
      value,
      signal: value < oversold ? 'BUY' : value > overbought ? 'SELL' : 'NEUTRAL'
    };
  }
};
