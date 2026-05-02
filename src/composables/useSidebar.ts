import { ref, computed, onMounted } from 'vue';

const isPinned = ref(false);
const isHovered = ref(false);

export function useSidebar() {
  const isExpanded = computed(() => isPinned.value || isHovered.value);

  const togglePin = () => {
    isPinned.value = !isPinned.value;
    localStorage.setItem('sidebar-pinned', String(isPinned.value));
  };

  const setHovered = (value: boolean) => {
    isHovered.value = value;
  };

  onMounted(() => {
    const savedPin = localStorage.getItem('sidebar-pinned');
    if (savedPin !== null) {
      isPinned.value = savedPin === 'true';
    }
  });

  return {
    isPinned,
    isExpanded,
    togglePin,
    setHovered,
  };
}
