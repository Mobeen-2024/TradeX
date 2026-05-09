export type NodeType = 'priceFeed' | 'rsiIndicator' | 'emaIndicator' | 'macdIndicator' | 'vwapIndicator' | 'atrIndicator' | 'bollingerIndicator' | 'ifElseLogic' | 'marketOrder' | 'twapOrder' | 'icebergOrder' | 'dcaOrder' | 'smartRouting' | 'riskManager' | 'sentiment' | 'whaleAlerts' | 'newsAnalysis' | 'volatilityPrediction' | 'bybitStream' | 'wsFeed';

export interface StrategyNodeData {
  label: string;
  category: string;
  [key: string]: any;
}
