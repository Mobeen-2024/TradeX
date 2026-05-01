import { ref } from 'vue';

export const activePositions = ref<{
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  leverage: string;
  liveDelta: number;
  liveDeltaPercent: number;
  size: number;
  cost: number;
  entry: number;
  mark: number;
  protocolLimits: [string, string];
}[]>([]);

export const addPosition = (position: {
  pair: string;
  type: 'LONG' | 'SHORT';
  leverage: string;
  size: number;
  cost: number;
  entry: number;
}) => {
  activePositions.value.push({
    id: Math.random().toString(36).substr(2, 9),
    pair: position.pair,
    type: position.type,
    leverage: position.leverage,
    size: position.size,
    cost: position.cost,
    entry: position.entry,
    mark: position.entry + (Math.random() * 10 - 5), // Mock mark
    liveDelta: Math.random() * 100 - 50,
    liveDeltaPercent: Math.random() * 5 - 2.5,
    protocolLimits: ['-', '-'],
  });
};

export const closePosition = (id: string) => {
  activePositions.value = activePositions.value.filter(p => p.id !== id);
};
