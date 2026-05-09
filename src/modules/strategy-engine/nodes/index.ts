import PriceFeedNode from './PriceFeedNode.vue';
import BybitStreamNode from './BybitStreamNode.vue';
import WsFeedNode from './WsFeedNode.vue';
import RsiNode from './RsiNode.vue';
import EmaNode from './EmaNode.vue';
import MacdNode from './MacdNode.vue';
import VwapNode from './VwapNode.vue';
import AtrNode from './AtrNode.vue';
import BollingerNode from './BollingerNode.vue';
import IfElseNode from './IfElseNode.vue';
import MarketOrderNode from './MarketOrderNode.vue';
import TwapNode from './TwapNode.vue';
import IcebergNode from './IcebergNode.vue';
import DcaNode from './DcaNode.vue';
import SmartRoutingNode from './SmartRoutingNode.vue';
import RiskManagerNode from './RiskManagerNode.vue';
import SentimentNode from './SentimentNode.vue';
import WhaleAlertsNode from './WhaleAlertsNode.vue';
import NewsAnalysisNode from './NewsAnalysisNode.vue';
import VolatilityPredictionNode from './VolatilityPredictionNode.vue';
import ZoneNode from './ZoneNode.vue';
import SmartSchedulerNode from './SmartSchedulerNode.vue';
import MarketUniverseNode from './MarketUniverseNode.vue';
import OHLCVNode from './OHLCVNode.vue';
import MarketRegimeNode from './MarketRegimeNode.vue';
import MultiFactorNode from './MultiFactorNode.vue';
import CandlestickAINode from './CandlestickAINode.vue';
import PositionSizingNode from './PositionSizingNode.vue';
import StopLossNode from './StopLossNode.vue';
import TakeProfitNode from './TakeProfitNode.vue';
import AIDecisionNode from './AIDecisionNode.vue';
import CorrelationNode from './CorrelationNode.vue';
import SectionNode from './SectionNode.vue';
import CommentNode from './CommentNode.vue';
import { NodeRegistry } from '../registry/NodeRegistry';
import { RsiNodePlugin } from '../registry/plugins/RsiNodePlugin';

// Register built-in smart nodes
NodeRegistry.register(RsiNodePlugin);

export const staticNodeTypes = {
  priceFeed: PriceFeedNode,
  bybitStream: BybitStreamNode,
  wsFeed: WsFeedNode,
  rsiIndicator: RsiNode,
  emaIndicator: EmaNode,
  macdIndicator: MacdNode,
  vwapIndicator: VwapNode,
  atrIndicator: AtrNode,
  bollingerIndicator: BollingerNode,
  ifElseLogic: IfElseNode,
  marketOrder: MarketOrderNode,
  twapOrder: TwapNode,
  icebergOrder: IcebergNode,
  dcaOrder: DcaNode,
  smartRouting: SmartRoutingNode,
  riskManager: RiskManagerNode,
  sentiment: SentimentNode,
  whaleAlerts: WhaleAlertsNode,
  newsAnalysis: NewsAnalysisNode,
  volatilityPrediction: VolatilityPredictionNode,
  zone: ZoneNode,
  smartScheduler: SmartSchedulerNode,
  marketUniverse: MarketUniverseNode,
  ohlcv: OHLCVNode,
  marketRegime: MarketRegimeNode,
  multiFactor: MultiFactorNode,
  candlestickAi: CandlestickAINode,
  positionSizing: PositionSizingNode,
  stopLoss: StopLossNode,
  takeProfit: TakeProfitNode,
  aiDecision: AIDecisionNode,
  correlation: CorrelationNode,
  section: SectionNode,
  comment: CommentNode,
};

export const getNodeTypes = () => {
    return {
        ...staticNodeTypes,
        ...NodeRegistry.getVueFlowTypes()
    };
};
