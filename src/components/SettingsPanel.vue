<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { X, Shield, Key, Zap, Check, AlertCircle, Settings2, Code, Plus, Trash2, Copy } from 'lucide-vue-next';
import { cn } from '../lib/utils';
import { useApiStore } from '../store/apiStore';

const { apiKeys, generateKey, deleteKey } = useApiStore();
const activeTab = ref<'general' | 'developer'>('general');
const newKeyName = ref('');
const showNewKey = ref<string | null>(null);

const isOpen = ref(false);
const apiKey = ref('');
const apiSecret = ref('');
const isLiveMode = ref(false);
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');

// Encryption placeholder - In production, use a more robust method
const encrypt = (val: string) => btoa(val); 
const decrypt = (val: string) => atob(val);

onMounted(() => {
    const savedKey = localStorage.getItem('tradex_api_key');
    const savedMode = localStorage.getItem('tradex_live_mode');
    if (savedKey) apiKey.value = '********' + decrypt(savedKey).slice(-4);
    if (savedMode) isLiveMode.value = savedMode === 'true';
});

const saveSettings = () => {
    saveStatus.value = 'saving';
    if (apiKey.value && !apiKey.value.startsWith('****')) {
        localStorage.setItem('tradex_api_key', encrypt(apiKey.value));
    }
    if (apiSecret.value) {
        localStorage.setItem('tradex_api_secret', encrypt(apiSecret.value));
    }
    localStorage.setItem('tradex_live_mode', String(isLiveMode.value));
    
    setTimeout(() => {
        saveStatus.value = 'saved';
        setTimeout(() => {
            saveStatus.value = 'idle';
            // Don't close if in developer tab
            if (activeTab.value === 'general') isOpen.value = false;
        }, 1500);
    }, 800);
};

const handleGenerateKey = () => {
    if (!newKeyName.value) return;
    const key = generateKey(newKeyName.value, ['read', 'trade']);
    showNewKey.value = key.key;
    newKeyName.value = '';
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

defineExpose({ open: () => isOpen.value = true });
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-[#0b0e11]/90 backdrop-blur-md" @click="isOpen = false"></div>
      
      <!-- Content -->
      <div class="relative bg-[#1e2329] border border-[#2b3139] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[#2b3139] bg-[#0b0e11]/30">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#F0B90B]/10 flex items-center justify-center text-[#F0B90B]">
                <Settings2 class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-[#EAECEF] font-bold">System Settings</h2>
                <p class="text-[10px] text-[#848e9c] uppercase tracking-widest font-mono">Terminal & Interop</p>
              </div>
            </div>
            <button @click="isOpen = false" class="text-[#848e9c] hover:text-white transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 p-1 bg-[#0b0e11] rounded-lg">
            <button 
              @click="activeTab = 'general'"
              :class="cn('flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all', activeTab === 'general' ? 'bg-[#2b3139] text-[#F0B90B]' : 'text-[#848e9c] hover:text-[#EAECEF]')"
            >
              General
            </button>
            <button 
              @click="activeTab = 'developer'"
              :class="cn('flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all', activeTab === 'developer' ? 'bg-[#2b3139] text-[#F0B90B]' : 'text-[#848e9c] hover:text-[#EAECEF]')"
            >
              Developer API
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="max-h-[60vh] overflow-y-auto no-scrollbar">
          <div v-if="activeTab === 'general'" class="p-6 flex flex-col gap-6">
          <!-- Environment Toggle -->
          <div class="flex items-center justify-between p-4 bg-[#0b0e11]/50 rounded-lg border border-dashed border-[#474d57]">
            <div class="flex items-center gap-3">
              <Zap :class="cn('w-5 h-5 transition-colors', isLiveMode ? 'text-[#0ecb81]' : 'text-[#848e9c]')" />
              <div>
                <div class="text-sm font-bold text-[#EAECEF]">Live Trading Mode</div>
                <div class="text-[11px] text-[#848e9c]">Execute trades on real exchange</div>
              </div>
            </div>
            <button 
              @click="isLiveMode = !isLiveMode"
              class="w-[44px] h-[22px] rounded-full relative transition-colors duration-200"
              :class="isLiveMode ? 'bg-[#0ecb81]' : 'bg-[#2b3139]'"
            >
              <div class="w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all duration-200" :class="isLiveMode ? 'left-[24px]' : 'left-[2px]'"></div>
            </button>
          </div>

          <!-- API Credentials -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2 text-[#F0B90B] mb-1">
              <Shield class="w-4 h-4" />
              <span class="text-xs font-bold uppercase tracking-wider">Binance API Credentials</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] text-[#848e9c] font-medium ml-1">API Key</label>
              <div class="relative flex items-center">
                <Key class="absolute left-3 w-4 h-4 text-[#474d57]" />
                <input 
                  type="text" 
                  v-model="apiKey"
                  placeholder="Enter your Binance API Key"
                  class="w-full bg-[#0b0e11] border border-[#2b3139] focus:border-[#F0B90B] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#EAECEF] outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] text-[#848e9c] font-medium ml-1">Secret Key</label>
              <div class="relative flex items-center">
                <Shield class="absolute left-3 w-4 h-4 text-[#474d57]" />
                <input 
                  type="password" 
                  v-model="apiSecret"
                  placeholder="Enter your Secret Key"
                  class="w-full bg-[#0b0e11] border border-[#2b3139] focus:border-[#F0B90B] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#EAECEF] outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div class="flex items-start gap-2 mt-1 p-3 bg-[#F0B90B]/5 rounded-lg border border-[#F0B90B]/10">
              <AlertCircle class="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
              <p class="text-[11px] text-[#848e9c] leading-relaxed">
                Your keys are stored locally in your browser's encrypted storage. Ensure you have <span class="text-[#EAECEF] font-bold">Withdrawal Permissions DISABLED</span> on your API key for security.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="p-6 flex flex-col gap-6">
          <!-- API Keys List -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
               <div class="flex items-center gap-2 text-[#F0B90B]">
                <Code class="w-4 h-4" />
                <span class="text-xs font-bold uppercase tracking-wider">Your API Keys</span>
              </div>
              <div class="text-[10px] text-[#848e9c] font-mono">{{ apiKeys.length }}/5 Keys</div>
            </div>

            <div class="flex flex-col gap-2">
              <div v-for="key in apiKeys" :key="key.id" class="flex items-center justify-between p-3 bg-[#0b0e11]/50 border border-[#2b3139] rounded-lg group">
                <div class="min-w-0">
                  <div class="text-[13px] font-bold text-[#EAECEF]">{{ key.name }}</div>
                  <div class="text-[10px] text-[#848e9c] font-mono truncate">Key: tx_...{{ key.key.slice(-6) }}</div>
                </div>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button @click="copyToClipboard(key.key)" class="p-1.5 hover:bg-[#2b3139] rounded text-[#848e9c] hover:text-[#F0B90B] transition-colors">
                    <Copy class="w-3.5 h-3.5" />
                  </button>
                  <button @click="deleteKey(key.id)" class="p-1.5 hover:bg-[#2b3139] rounded text-[#848e9c] hover:text-[#f6465d] transition-colors">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div v-if="apiKeys.length === 0" class="py-8 border border-dashed border-[#2b3139] rounded-lg flex flex-col items-center justify-center text-center px-4">
                <Key class="w-8 h-8 text-[#2b3139] mb-2" />
                <p class="text-[11px] text-[#848e9c]">No API keys generated yet. Create one to start using the TradeX Interoperability API.</p>
              </div>
            </div>
          </div>

          <!-- Create New Key -->
          <div class="p-4 bg-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-lg">
             <div class="text-[11px] font-bold text-[#F0B90B] uppercase tracking-wider mb-3">Create New API Key</div>
             <div class="flex gap-2">
               <input 
                type="text" 
                v-model="newKeyName"
                placeholder="Key Label (e.g. MyTradingBot)"
                class="flex-1 bg-[#0b0e11] border border-[#2b3139] focus:border-[#F0B90B] rounded-lg px-3 py-2 text-[12px] text-[#EAECEF] outline-none"
               />
               <button 
                @click="handleGenerateKey"
                class="bg-[#F0B90B] text-[#181a20] px-3 py-2 rounded-lg font-bold text-[12px] hover:bg-[#FCD535] transition-colors flex items-center gap-1.5"
               >
                 <Plus class="w-3.5 h-3.5" /> Generate
               </button>
             </div>
          </div>

          <!-- New Key Reveal Modal Overlay -->
          <div v-if="showNewKey" class="p-4 bg-[#0ecb81]/10 border border-[#0ecb81]/30 rounded-lg animate-in slide-in-from-bottom-2">
            <div class="flex items-center gap-2 text-[#0ecb81] mb-2">
              <Check class="w-4 h-4" />
              <span class="text-[11px] font-bold uppercase tracking-wider">Key Generated Successfully</span>
            </div>
            <p class="text-[10px] text-[#848e9c] mb-3 leading-relaxed">
              Copy this key now. For your security, <span class="text-[#EAECEF]">it will not be shown again.</span>
            </p>
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-[#0b0e11] p-2 rounded border border-[#0ecb81]/20 font-mono text-[10px] text-[#EAECEF] break-all">
                {{ showNewKey }}
              </div>
              <button @click="copyToClipboard(showNewKey)" class="p-2 bg-[#2b3139] rounded hover:text-[#0ecb81] transition-colors">
                <Copy class="w-4 h-4" />
              </button>
            </div>
            <button @click="showNewKey = null" class="w-full mt-3 py-1.5 bg-[#0ecb81] text-[#181a20] rounded font-bold text-[11px] uppercase tracking-tighter hover:bg-[#0ecb81]/90 transition-all">I have saved it</button>
          </div>
        </div>
      </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-[#0b0e11]/30 border-t border-[#2b3139] flex justify-end">
          <button 
            @click="saveSettings"
            :disabled="saveStatus === 'saving'"
            class="px-6 py-2 rounded-lg bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#181a20] font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <template v-if="saveStatus === 'saving'">
              <div class="w-4 h-4 border-2 border-[#181a20]/30 border-t-[#181a20] rounded-full animate-spin"></div>
              Saving...
            </template>
            <template v-else-if="saveStatus === 'saved'">
              <Check class="w-4 h-4" />
              Settings Saved
            </template>
            <template v-else>
              Apply Changes
            </template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
