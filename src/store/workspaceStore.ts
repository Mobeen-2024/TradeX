import { ref, watch } from 'vue';

export interface ChartPanelConfig {
  id: string;
  symbol: string;
  timeframe: string;
  isSynced: boolean;
  drawings?: { type: 'hline', price: number, id: string }[];
}

const DEFAULT_LAYOUT: ChartPanelConfig[] = [
  { id: 'panel-1', symbol: 'BTCUSDT', timeframe: '1D', isSynced: true }
];

const STORAGE_KEY = 'tradex_workspace_layout';

function loadSavedLayout(): ChartPanelConfig[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load workspace layout:', e);
    }
  }
  return DEFAULT_LAYOUT;
}

export const workspacePanels = ref<ChartPanelConfig[]>(loadSavedLayout());
export const globalSymbol = ref('BTCUSDT');

watch(workspacePanels, (newPanels) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPanels));
  }
}, { deep: true });

export const addPanel = () => {
  const id = `panel-${Date.now()}`;
  workspacePanels.value.push({
    id,
    symbol: globalSymbol.value,
    timeframe: '15m',
    isSynced: true
  });
};

export const removePanel = (id: string) => {
  if (workspacePanels.value.length <= 1) return;
  workspacePanels.value = workspacePanels.value.filter(p => p.id !== id);
};

export const updateGlobalSymbol = (symbol: string) => {
  globalSymbol.value = symbol;
  // All synced panels will follow this via props in the UI
};
