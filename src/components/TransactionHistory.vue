<script setup lang="ts">
import { 
  ArrowDownUp, 
  FileClock,
  ChevronRight,
  Minus
} from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { ref } from 'vue';
import { activePositions, closePosition } from '../store/tradeStore';

const activeTab = ref(0);
</script>

<template>
  <div class="bg-[#0b0e11] flex-1 flex flex-col min-h-0 sm:border sm:border-[#1e2329] sm:rounded-lg overflow-hidden font-sans">
    
    <!-- Header Tabs -->
    <div class="flex items-end justify-between px-4 border-0 shrink-0 rounded-[6px]">
      <div class="flex items-center gap-6 h-[36px] rounded-[6px] text-center text-[10px] leading-[15px]">
        <button 
          @click="activeTab = 0"
          :class="cn(
            'pb-1 relative transition-colors h-full flex flex-col justify-end',
            activeTab === 0 ? 'text-[#EAECEF]' : 'text-[#848e9c]'
          )"
        >
          <span class="text-[12px] font-bold font-sans text-center leading-[21px]">Positions <span v-if="activeTab === 0" class="font-normal">({{ activePositions.length }})</span></span>
          <div v-show="activeTab === 0" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#fcd535] rounded-t-sm"></div>
        </button>
        <button 
          @click="activeTab = 1"
          :class="cn(
            'pb-1 relative transition-colors h-full flex flex-col justify-end',
            activeTab === 1 ? 'text-[#EAECEF]' : 'text-[#848e9c]'
          )"
        >
          <span class="text-[12px] font-bold font-sans w-[100px] h-[28px] leading-[24px] flex items-end justify-center">Open Orders (0)</span>
          <div v-show="activeTab === 1" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#fcd535] rounded-t-sm"></div>
        </button>
      </div>
      <div class="flex items-center gap-4 pb-3 text-[#848e9c]">
        <ArrowDownUp class="w-[18px] h-[18px] hover:text-[#EAECEF] cursor-pointer" stroke-width="2" />
        <FileClock class="w-[18px] h-[18px] hover:text-[#EAECEF] cursor-pointer" stroke-width="2" />
      </div>
    </div>

    <div class="flex-1 overflow-auto bg-[#0b0e11] flex flex-col no-scrollbar">
      
      <div v-if="activeTab === 0" class="flex flex-col">
        <!-- Sub-header -->
        <div class="flex items-center justify-between px-4 py-3 rounded-[7px] border-none">
          <label class="flex items-center gap-2 text-[13px] text-[#EAECEF] cursor-pointer cursor-default">
            <input type="checkbox" class="w-4 h-4 rounded-sm border-[#848e9c] text-[#F0B90B] focus:ring-[#F0B90B]" />
            Hide Other Symbols
          </label>
          <button class="bg-[#2b3139] text-[#848e9c] px-3 py-1.5 rounded-[4px] text-[12px] font-medium pointer-events-none">
            Repay All Symbols
          </button>
        </div>

        <div v-if="activePositions.length === 0" class="flex-1 flex items-center justify-center text-[#848e9c] font-medium text-sm py-10">
          No positions
        </div>

        <!-- Position Items -->
        <div class="flex flex-col select-text" v-else>
          <div 
            v-for="(pos, index) in activePositions" 
            :key="pos.id"
            class="flex flex-col p-4 border-b border-[#1e2329] rounded-[25px] h-[265.4px]"
          >
            <!-- Top info -->
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center gap-2">
                <div class="bg-[#848e9c] rounded-[2px] w-[18px] h-[18px] flex items-center justify-center shrink-0">
                  <Minus class="w-3.5 h-3.5 text-white" stroke-width="3" />
                </div>
                <h3 class="text-[#EAECEF] font-bold text-[18px] leading-none flex items-center gap-1">
                  {{ pos.pair }}
                  <ChevronRight class="w-4 h-4 text-[#848e9c]" />
                </h3>
              </div>
              <div class="flex items-center gap-1.5">
                <!-- SVG Icon for Margin Level -->
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#EAECEF" stroke-width="4"/>
                  <path d="M12 2A10 10 0 0122 12" stroke="#0ECB81" stroke-width="4" stroke-linecap="round"/>
                  <path d="M22 12A10 10 0 0112 22" stroke="#FCD535" stroke-width="4" stroke-linecap="round"/>
                  <path d="M12 22A10 10 0 012 12" stroke="#F6465D" stroke-width="4" stroke-linecap="round"/>
                  <circle cx="12" cy="12" r="4" fill="#1E2329"/>
                  <path d="M12 12L17 12" stroke="#1E2329" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="text-[13px] font-medium text-[#0ecb81]">Margin level 999.00</span>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-y-4 gap-x-2 h-[158.8px]">
              
              <!-- Row 1 -->
              <div class="flex flex-col gap-1 items-start">
                <div class="inline-block border-b border-dotted border-[#848e9c] text-[12px] text-[#848e9c] leading-[14px]">PNL ({{ pos.pair.split('/')[1] || 'USDT' }})</div>
                <div :class="cn('text-[16px] font-medium', pos.liveDelta >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]')">
                  {{ pos.liveDelta > 0 ? '+' : '' }}{{ pos.liveDelta.toFixed(2) }}
                 </div>
              </div>

              <div class="flex flex-col gap-1 items-start">
                <div class="inline-block border-b border-dotted border-[#848e9c] text-[12px] text-[#848e9c] leading-[14px]">RealizedPnl ({{ pos.pair.split('/')[1] || 'USDT' }})</div>
                <div class="text-[16px] font-medium text-[#EAECEF]">
                  0.00
                </div>
              </div>

              <div class="flex flex-col gap-1 items-end text-right">
                <div class="inline-block border-b border-dotted border-[#848e9c] text-[12px] text-[#848e9c] leading-[14px]">Cost ({{ pos.pair.split('/')[1] || 'USDT' }})</div>
                <div class="text-[15px] font-medium text-[#EAECEF]">
                  {{ pos.cost?.toFixed(2) || '0.00' }}
                </div>
              </div>

              <!-- Row 2 -->
              <div class="flex flex-col gap-1 items-start">
                <div class="text-[12px] text-[#848e9c] leading-[14px]">{{ pos.pair.split('/')[0] }} Balance</div>
                <div class="text-[14px] font-medium text-[#EAECEF] flex items-baseline gap-1">
                  {{ pos.size?.toFixed(4) || '0.00' }}
                  <span class="text-[12px] font-normal text-[#848e9c]">&approx;{{ pos.cost?.toFixed(2) || '0.00' }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-1 items-start">
                <div class="text-[12px] text-[#848e9c] leading-[14px]">{{ pos.pair.split('/')[0] }} Debt</div>
                <div class="text-[14px] font-medium text-[#EAECEF]">
                  0.00
                </div>
              </div>

              <div class="flex flex-col gap-1 items-end text-right">
                <div class="inline-block border-b border-dotted border-[#848e9c] text-[12px] text-[#848e9c] leading-[12px] text-right">Hourly Interest<br/>({{ pos.pair.split('/')[1] || 'USDT' }})</div>
                <div class="text-[14px] font-medium text-[#EAECEF]">
                  0.000000%
                </div>
              </div>

              <!-- Row 3 -->
              <div class="flex flex-col gap-1 items-start">
                <div class="text-[12px] text-[#848e9c] leading-[14px]">{{ pos.pair.split('/')[1] || 'USDT' }} Balance</div>
                <div class="text-[14px] font-medium text-[#EAECEF]">
                  1000.00
                </div>
              </div>

              <div class="flex flex-col gap-1 items-start">
                <div class="text-[12px] text-[#848e9c] leading-[14px]">{{ pos.pair.split('/')[1] || 'USDT' }} Debt</div>
                <div class="text-[14px] font-medium text-[#EAECEF]">
                  0.00
                </div>
              </div>

              <div class="flex flex-col gap-1 items-end text-right">
                <div class="inline-block border-b border-dotted border-[#848e9c] text-[12px] text-[#848e9c] leading-[14px]">Liq.price</div>
                <div class="text-[14px] font-medium text-[#fCD535]">
                  {{ (pos.entry * (pos.type === 'LONG' ? 0.95 : 1.05)).toFixed(2) }}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-3 gap-3 mt-5">
              <button 
                @click="closePosition(pos.id)"
                class="bg-[#2b3139] hover:bg-[#323a43] text-[#EAECEF] rounded-[5px] py-[6px] text-[14px] font-medium transition-colors"
              >
                Close Position
              </button>
              <button class="bg-[#2b3139] hover:bg-[#323a43] text-[#EAECEF] rounded-[5px] py-[6px] text-[14px] font-medium transition-colors">
                Add Margin
              </button>
              <button class="bg-[#2b3139] hover:bg-[#323a43] text-[#EAECEF] rounded-[5px] py-[6px] text-[14px] font-medium transition-colors">
                TP/SL
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  </div>
</template>


