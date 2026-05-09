<script setup lang="ts">
import { ref } from 'vue';
import { Blocks, Zap, Crosshair } from 'lucide-vue-next';

const emit = defineEmits(['loadTemplate']);

const nodeSearchQuery = ref('');

// Handle dragging from the palette into the VueFlow Canvas
function onDragStart(event: DragEvent, nodeType: string, data: any) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', JSON.stringify({ nodeType, data }));
    event.dataTransfer.effectAllowed = 'move';
  }
}

const basicTemplates = [
  { id: 'scalper', icon: '⚡', name: 'AI Momentum Scalper' },
  { id: 'dca', icon: '🔁', name: 'Smart DCA Engine' },
];

const categories = [
  {
      name: 'Market Data',
      color: 'text-[#F0B90B]',
      match: ['market', 'feed', 'binance', 'bybit', 'ws', 'price', 'stream', 'ohlcv', 'orderbook'],
      items: [
          { type: 'ohlcv', icon: '📊', label: 'OHLCV Fetch', colSpan: 2, data: { exchange: 'Binance', timeframes: ['1m', '15m', '1h'], websocket: true, caching: true }, styleClass: 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81] hover:border-[#0ecb81] hover:bg-[#0ecb81]/20 font-bold' },
          { type: 'orderbook', icon: '📚', label: 'Orderbook', colSpan: 2, data: { depth: 50, updateInterval: '100ms' } },
          { type: 'priceFeed', icon: '📥', label: 'Binance', data: { pair: 'BTC/USDT', source: 'Binance' } },
          { type: 'bybitStream', icon: '📥', label: 'Bybit', data: { pair: 'BTCUSDT', type: 'Perpetual' } },
          { type: 'wsFeed', icon: '🔌', label: 'WebSockets', colSpan: 2, data: { url: 'wss://', channel: 'trades' } },
      ]
  },
  {
      name: 'Indicators',
      color: 'text-[#627EEA]',
      match: ['indicators', 'math', 'rsi', 'ema', 'macd', 'vwap', 'atr', 'bollinger'],
      items: [
          { type: 'rsiIndicator', icon: '📊', label: 'RSI', data: { period: 14 } },
          { type: 'emaIndicator', icon: '📈', label: 'EMA', data: { period: 20 } },
          { type: 'macdIndicator', icon: '📉', label: 'MACD', data: { fast: 12, slow: 26, signal: 9 } },
          { type: 'vwapIndicator', icon: '🌊', label: 'VWAP', data: { anchor: 'Session' } },
          { type: 'atrIndicator', icon: '📏', label: 'ATR', data: { period: 14 } },
          { type: 'bollingerIndicator', icon: '🌐', label: 'Bollinger', data: { length: 20, stdDev: 2 } },
      ]
  },
  {
      name: 'Smart Money',
      color: 'text-[#3b82f6]',
      match: ['whale', 'alerts', 'outflows', 'inflows', 'smart', 'money'],
      items: [
          { type: 'whaleAlerts', icon: '🐋', label: 'Whale Alerts', colSpan: 2, data: { largeTx: '> $10M', outflows: 'High Outflows', smartMoney: 'Accumulating' }, styleClass: 'bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] hover:border-[#3b82f6] hover:bg-[#3b82f6]/20 font-bold' },
      ]
  },
  {
      name: 'AI',
      color: 'text-[#a855f7]',
      match: ['ai', 'intelligence', 'sentiment', 'news', 'analysis', 'decision', 'gemini'],
      items: [
          { type: 'aiDecision', icon: '🤖', label: 'Gemini Analysis', colSpan: 2, data: { analysis: ['Trend', 'Sentiment', 'Volatility', 'Correlations'], confidence: '78%', riskLevel: 'Medium' }, styleClass: 'bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] hover:border-[#a855f7] hover:bg-[#a855f7]/20 font-bold' },
          { type: 'candlestickAi', icon: '🕯️', label: 'Candlestick AI', colSpan: 2, data: { direction: 'Bullish Reversal', probabilities: [{ pattern: 'Engulfing', score: 82 }] }, styleClass: 'bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] hover:border-[#a855f7] hover:bg-[#a855f7]/20 font-bold' },
          { type: 'sentiment', icon: '🧠', label: 'Sentiment', data: { source: 'Twitter/X', asset: 'BTC' }, styleClass: 'bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] hover:border-[#a855f7] hover:bg-[#a855f7]/20 font-bold' },
          { type: 'newsAnalysis', icon: '📰', label: 'News Analysis', data: { impact: 'High' }, styleClass: 'bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] hover:border-[#a855f7] hover:bg-[#a855f7]/20 font-bold' },
      ]
  },
  {
      name: 'Logic',
      color: 'text-[#eab308]',
      match: ['logic', 'if', 'else', 'multi', 'condition', 'manager'],
      items: [
          { type: 'ifElseLogic', icon: '⚖️', label: 'IF/ELSE', colSpan: 2, data: { condition: 'val < 30' } },
          { type: 'multiFactor', icon: '✅', label: 'Multi-Condition', colSpan: 2, data: { factors: [{ condition: 'Williams %R < -80' }, { condition: 'Volume Spike > 1.5x' }] }, styleClass: 'bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] hover:border-[#eab308] hover:bg-[#eab308]/20 font-bold' },
      ]
  },
  {
      name: 'Risk',
      color: 'text-[#f59e0b]',
      match: ['risk', 'position', 'sizing', 'stop', 'loss', 'take', 'profit'],
      items: [
          { type: 'positionSizing', icon: '⚖️', label: 'Position Size', colSpan: 2, data: { algorithm: 'Kelly Criterion', riskLimit: '2.0%' }, styleClass: 'bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] hover:border-[#f59e0b] hover:bg-[#f59e0b]/20 font-bold' },
          { type: 'stopLoss', icon: '🛡️', label: 'Stop Loss', data: { logic: 'Swing Low', buffer: '1x ATR' }, styleClass: 'bg-[#f6465d]/10 border border-[#f6465d]/30 text-[#f6465d] hover:border-[#f6465d] hover:bg-[#f6465d]/20 font-bold' },
          { type: 'takeProfit', icon: '🎯', label: 'Take Profit', data: { target: '50 SMA', rr: '1 : 2.3' }, styleClass: 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81] hover:border-[#0ecb81] hover:bg-[#0ecb81]/20 font-bold' },
          { type: 'riskManager', icon: '⚡', label: 'Risk Rules', colSpan: 2, data: { killSwitch: false, maxDrawdown: '5%' }, styleClass: 'bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] hover:border-[#f59e0b] hover:bg-[#f59e0b]/20 font-bold' },
      ]
  },
  {
      name: 'Execution',
      color: 'text-[#0ecb81]',
      match: ['execution', 'twap', 'orders', 'dca', 'iceberg', 'smart', 'route'],
      items: [
          { type: 'marketOrder', icon: '⚡', label: 'Orders', data: { action: 'BUY', type: 'MARKET', size: '100%' }, styleClass: 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81] hover:border-[#0ecb81] hover:bg-[#0ecb81]/20 font-bold' },
          { type: 'twapOrder', icon: '⏱️', label: 'TWAP', data: { duration: '24h', interval: '5m', size: '10 BTC' }, styleClass: 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81] hover:border-[#0ecb81] hover:bg-[#0ecb81]/20 font-bold' },
          { type: 'icebergOrder', icon: '🧊', label: 'Iceberg', data: { totalSize: '10', displaySize: '1' }, styleClass: 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81] hover:border-[#0ecb81] hover:bg-[#0ecb81]/20 font-bold' },
          { type: 'dcaOrder', icon: '🔁', label: 'DCA', data: { amount: '$1000', frequency: 'Daily' }, styleClass: 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81] hover:border-[#0ecb81] hover:bg-[#0ecb81]/20 font-bold' },
      ]
  },
  {
      name: 'Portfolio',
      color: 'text-[#8b5cf6]',
      match: ['portfolio', 'correlation', 'universe'],
      items: [
          { type: 'correlation', icon: '🔗', label: 'Correlation', colSpan: 2, data: { assets: ['BTC', 'ETH', 'SOL'], maxOverlap: '1' }, styleClass: 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] hover:border-[#8b5cf6] hover:bg-[#8b5cf6]/20 font-bold' },
          { type: 'marketUniverse', icon: '🌍', label: 'Universe', colSpan: 2, data: { mode: 'Top Volume', limit: 50, examples: ['BTC', 'ETH', 'SOL'] }, styleClass: 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] hover:border-[#8b5cf6] hover:bg-[#8b5cf6]/20 font-bold' },
      ]
  },
  {
      name: 'Notifications',
      color: 'text-[#38bdf8]',
      match: ['notifications', 'telegram', 'discord', 'webhook', 'alert'],
      items: [
          { type: 'telegramAlert', icon: '✈️', label: 'Telegram', colSpan: 2, data: { botToken: '...', chatId: '...', message: 'Trade Executed' }, styleClass: 'bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] hover:border-[#38bdf8] hover:bg-[#38bdf8]/20 font-bold' },
          { type: 'discordAlert', icon: '🤖', label: 'Discord', colSpan: 2, data: { webhookUrl: '...', message: 'Trade Executed' }, styleClass: 'bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] hover:border-[#38bdf8] hover:bg-[#38bdf8]/20 font-bold' },
      ]
  },
  {
      name: 'Utilities',
      color: 'text-[#94a3b8]',
      match: ['utilities', 'delay', 'loop', 'scheduler'],
      items: [
          { type: 'smartScheduler', icon: '⏱️', label: 'Scheduler', colSpan: 2, data: { interval: '15m', mode: 'Candle Close' } },
          { type: 'delayNode', icon: '⏳', label: 'Delay', data: { duration: '5s' } },
          { type: 'loopNode', icon: '🔁', label: 'Loop', data: { iterations: 3 } },
      ]
  },
  {
      name: 'Quant',
      color: 'text-[#ec4899]',
      match: ['quant', 'z-score', 'beta', 'statistical', 'arbitrage'],
      items: [
          { type: 'zScore', icon: '🧮', label: 'Z-score', data: { period: 20 } },
          { type: 'beta', icon: '📉', label: 'Beta', data: { benchmark: 'BTC', period: 30 } },
          { type: 'marketRegime', icon: '🧠', label: 'Regime', colSpan: 2, data: { state: 'Deep Oversold', confidence: '84%' }, styleClass: 'bg-[#ec4899]/10 border border-[#ec4899]/30 text-[#ec4899] hover:border-[#ec4899] hover:bg-[#ec4899]/20 font-bold' },
      ]
  },
  {
      name: 'Machine Learning',
      color: 'text-[#10b981]',
      match: ['machine', 'learning', 'prediction', 'volatility'],
      items: [
          { type: 'predictionModel', icon: '🔮', label: 'Prediction', colSpan: 2, data: { target: 'Close', horizon: '1h', model: 'LSTM' }, styleClass: 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:border-[#10b981] hover:bg-[#10b981]/20 font-bold' },
          { type: 'volatilityPrediction', icon: '🎢', label: 'Volatility', data: { window: '4h' }, styleClass: 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:border-[#10b981] hover:bg-[#10b981]/20 font-bold' },
      ]
  },
  {
      name: 'Canvas Layout',
      color: 'text-[#10b981]',
      match: ['layout', 'zone', 'group', 'container', 'section'],
      items: [
          { type: 'zone', icon: '🔲', label: 'Strategy Zone', colSpan: 2, data: { label: 'Strategy Zone', color: '#627EEA' }, styleClass: 'border border-dashed border-[#627EEA]/50 text-[#627EEA] hover:bg-[#627EEA]/10 font-bold bg-transparent' },
      ]
  }
];

</script>

<template>
  <div class="w-[280px] h-full bg-transparent flex flex-col shrink-0 border-r border-white/5 relative">
    <div class="absolute inset-0 bg-black/20 pointer-events-none rounded-2xl rounded-r-none backdrop-blur-sm"></div>
    <div class="px-4 py-4 shrink-0 border-b border-white/5 relative z-10">
        <h4 class="text-xs font-bold text-white/90 flex items-center gap-2 tracking-widest uppercase">
            <Blocks class="w-4 h-4 text-[#F0B90B]" /> Components
        </h4>
        <p class="text-[10px] text-white/40 mt-1 font-medium tracking-wide">Drag & drop neural blocks</p>
    </div>

    <div class="px-4 pt-4 shrink-0 relative z-10">
        <input type="text" v-model="nodeSearchQuery" placeholder="Search templates, inputs..." class="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all font-mono shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]" />
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-6 relative z-10 pt-4">
        <!-- Templates -->
        <div v-show="!nodeSearchQuery || 'templates strategy scalper dca arbitrage'.includes(nodeSearchQuery.toLowerCase())">
            <div class="text-[9px] uppercase font-bold text-white/40 tracking-widest mt-0 mb-3 ml-1">Pre-built Playbooks</div>
            <div class="flex flex-col gap-2">
                <div v-for="tpl in basicTemplates" :key="tpl.id" class="bg-gradient-to-r from-white/[0.05] to-transparent border border-white/[0.05] hover:border-white/20 text-white rounded-xl p-3 text-xs flex justify-between items-center cursor-pointer transition-all duration-300 shadow-sm" @click="emit('loadTemplate', tpl.id)">
                  <span class="font-bold flex items-center gap-2 font-mono tracking-wide">{{ tpl.icon }} {{ tpl.name }}</span>
                  <span class="opacity-30 hover:opacity-100 text-[10px] uppercase font-bold tracking-widest transition-opacity duration-300">+ Add</span>
                </div>
            </div>
        </div>

        <div v-for="cat in categories" :key="cat.name" v-show="!nodeSearchQuery || cat.match.some(m => nodeSearchQuery.toLowerCase().includes(m))">
            <div :class="`text-[9px] uppercase font-bold ${cat.color} opacity-80 tracking-widest mt-0 mb-3 ml-1`">{{ cat.name }}</div>
            <div class="grid grid-cols-2 gap-2">
                <div v-for="item in cat.items" :key="item.type"
                     draggable="true" @dragstart="onDragStart($event, item.type, item.data)"
                     :class="`rounded-xl p-3 text-[11px] font-medium cursor-move transition-all duration-300 flex items-center gap-2 ${item.colSpan === 2 ? 'col-span-2' : ''} ${item.styleClass ? item.styleClass : 'bg-black/20 border border-white/[0.05] text-white hover:border-white/20 hover:bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'}`">
                    <span class="w-4 text-center opacity-80">{{ item.icon }}</span> 
                    <span class="tracking-wide">{{ item.label }}</span>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
