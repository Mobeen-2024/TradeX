<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { ChevronDown, Search, Star } from "lucide-vue-next";
import { cn } from "../lib/utils";
import { isLiveMode, marketData } from "../store/tradeStore";
import { globalSymbol, updateGlobalSymbol } from "../store/workspaceStore";

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

const isOpen = ref(false);
const searchQuery = ref("");
const allPairs = ref<BinanceTicker[]>([]);
let intervalId: any;

const formatVolume = (vol: string) => {
  const num = Number(vol);
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
};

const fetchTickers = async () => {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!response.ok) throw new Error("Failed to fetch");
    const data: BinanceTicker[] = await response.json();
    allPairs.value = data
      .filter((d) => d.symbol.endsWith("USDT"))
      .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
  } catch (e) {
    console.error("Failed to fetch Binance tickers", e);
    // Fallback data if API is blocked (e.g. CORS)
    allPairs.value = [
      { symbol: "BTCUSDT", lastPrice: "75000", priceChangePercent: "2.5", quoteVolume: "2000000000" },
      { symbol: "ETHUSDT", lastPrice: "3800", priceChangePercent: "1.2", quoteVolume: "1000000000" },
      { symbol: "SOLUSDT", lastPrice: "150", priceChangePercent: "-0.5", quoteVolume: "500000000" },
      { symbol: "BNBUSDT", lastPrice: "600", priceChangePercent: "0.8", quoteVolume: "400000000" },
      { symbol: "XRPUSDT", lastPrice: "0.6", priceChangePercent: "0.1", quoteVolume: "300000000" },
      { symbol: "DOGEUSDT", lastPrice: "0.15", priceChangePercent: "5.0", quoteVolume: "200000000" }
    ];
  }
};

const filteredResults = computed(() => {
  const query = searchQuery.value.toLowerCase();
  let pairs = allPairs.value;
  if (query) {
    pairs = pairs.filter((p) => p.symbol.toLowerCase().includes(query));
  }
  return pairs.slice(0, 50);
});

const activeTicker = computed(() => {
  return allPairs.value.find((p) => p.symbol === globalSymbol.value);
});

const displayChange = computed(() => {
  if (activeTicker.value) {
    const change = Number(activeTicker.value.priceChangePercent);
    return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  }
  return marketData.value.change24h;
});

const displayVolume = computed(() => {
  if (activeTicker.value) {
    return formatVolume(activeTicker.value.quoteVolume);
  }
  return marketData.value.volUsdt24h;
});

const isPositive = computed(() => displayChange.value.startsWith("+"));

const selectPair = (symbol: string) => {
  isOpen.value = false;
  updateGlobalSymbol(symbol);
  searchQuery.value = "";
};

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".coin-selector-container")) {
    isOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener("mousedown", closeDropdown);
  fetchTickers();
  intervalId = setInterval(fetchTickers, 10000);
});

onUnmounted(() => {
  window.removeEventListener("mousedown", closeDropdown);
  clearInterval(intervalId);
});
</script>

<template>
  <div class="relative coin-selector-container">
    <div
      @click="isOpen = !isOpen"
      class="flex flex-col items-start cursor-pointer hover:bg-white/5 px-2 md:px-3 py-1.5 rounded-xl transition-all group border border-transparent hover:border-cyan-500/20"
    >
      <div class="flex items-center gap-2">
        <h1
          class="text-xl font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
        >
          {{ globalSymbol.replace("USDT", "")
          }}<span
            class="text-xs font-mono text-white/50 tracking-normal drop-shadow-none"
            >/USDT</span
          >
        </h1>
        <ChevronDown
          :class="
            cn(
              'w-4 h-4 text-cyan-400 transition-transform duration-300',
              isOpen ? 'rotate-180' : '',
            )
          "
        />
      </div>
      <div class="flex items-center gap-3 mt-0.5">
        <span
          :class="
            cn(
              'text-[11px] font-mono font-bold tabular-nums',
              isPositive ? 'text-[#39ff14]' : 'text-[#ff073a]',
            )
          "
        >
          {{ displayChange }}
        </span>
        <span
          class="text-[10px] font-mono text-gray-500 uppercase tracking-widest tabular-nums"
        >
          VOL_{{ displayVolume.replace("B", "B").replace("M", "M") }}
        </span>
      </div>
    </div>

    <!-- Mobile Overlay Backdrop -->
    <div
      v-show="isOpen"
      class="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-[60] sm:hidden pointer-events-none"
    ></div>

    <!-- Dropdown Menu Container (Tactical Aesthetic) -->
    <div
      v-show="isOpen"
      class="fixed top-20 left-4 right-4 sm:absolute sm:top-full sm:left-0 sm:mt-2 sm:w-[350px] bg-[#05070a]/95 backdrop-blur-2xl border border-[#00f0ff]/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Search Header -->
      <div class="p-3 border-b border-[#00f0ff]/20 bg-[#05070a]">
        <div
          class="flex items-center bg-black/50 rounded-lg px-2 py-2 border border-[#00f0ff]/20 focus-within:shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all"
        >
          <Search class="w-4 h-4 text-[#00f0ff] mr-2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="SEARCH_NODE (E.G. BTC)"
            class="flex-1 bg-transparent border-none outline-none text-xs font-mono text-[#00f0ff] uppercase placeholder:text-[#00f0ff]/50"
            autofocus
          />
        </div>
      </div>

      <!-- Result List -->
      <div class="max-h-[350px] overflow-y-auto no-scrollbar py-1">
        <div
          v-for="r in filteredResults"
          :key="r.symbol"
          @click="selectPair(r.symbol)"
          :class="
            cn(
              'flex items-center justify-between px-4 py-2 cursor-pointer group border-b border-transparent transition-all',
              globalSymbol === r.symbol
                ? 'bg-[#00f0ff]/10 border-[#00f0ff]/30 box-glow animate-[shimmer_2s_infinite]'
                : 'hover:bg-white/5 hover:border-white/20',
            )
          "
        >
          <div class="flex flex-col items-start gap-1">
            <div class="flex items-center gap-2">
              <Star
                class="w-3.5 h-3.5 text-[#474d57] group-hover:text-[#F0B90B] transition-colors"
              />
              <span
                class="text-sm font-black tracking-widest text-[#EAECEF] uppercase"
                >{{ r.symbol.replace("USDT", "") }}/USDT</span
              >
            </div>
            <span
              class="text-[10px] font-mono text-gray-500 uppercase tabular-nums pl-5.5"
            >
              VOL_{{ formatVolume(r.quoteVolume) }}
            </span>
          </div>
          <div class="text-right flex flex-col items-end gap-1">
            <div class="text-[13px] font-mono font-bold text-[#EAECEF]">
              {{
                Number(r.lastPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: Number(r.lastPrice) < 1 ? 6 : 2,
                })
              }}
            </div>
            <div
              :class="
                cn(
                  'text-[10px] font-mono font-bold',
                  Number(r.priceChangePercent) >= 0
                    ? 'text-[#39ff14]'
                    : 'text-[#ff073a]',
                )
              "
            >
              {{ Number(r.priceChangePercent) >= 0 ? "+" : ""
              }}{{ r.priceChangePercent }}%
            </div>
          </div>
        </div>
        <div
          v-if="filteredResults.length === 0"
          class="text-center py-6 text-xs text-[#00f0ff]/70 font-mono"
        >
          NO NODES FOUND
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
.animate-\[shimmer_2s_infinite\] {
  animation: shimmer 2s infinite linear;
  background-size: 200% 100%;
  background-image: linear-gradient(
    90deg,
    transparent,
    rgba(0, 240, 255, 0.1) 50%,
    transparent
  );
}
.box-glow {
  box-shadow:
    0 0 15px rgba(0, 240, 255, 0.2),
    inset 0 0 10px rgba(0, 240, 255, 0.1);
}
.pl-5\.5 {
  padding-left: 1.375rem;
}
</style>
