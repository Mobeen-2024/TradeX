<script setup lang="ts">
import { ref, watch } from 'vue';
import { activeNotifications, markAsRead, Notification } from '../store/alertStore';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-vue-next';
import { cn } from '../lib/utils';

const TOAST_DURATION = 5000;

const visibleToasts = ref<Notification[]>([]);

watch(activeNotifications, (newList) => {
    // Only add new ones that aren't already being displayed
    newList.forEach(n => {
        if (!visibleToasts.value.find(v => v.id === n.id)) {
            visibleToasts.value.push(n);
            setTimeout(() => {
                removeToast(n.id);
            }, TOAST_DURATION);
        }
    });
}, { deep: true });

const removeToast = (id: string) => {
    visibleToasts.value = visibleToasts.value.filter(v => v.id !== id);
    markAsRead(id);
};

const getIcon = (type: Notification['type']) => {
    switch (type) {
        case 'success': return CheckCircle2;
        case 'error': return AlertCircle;
        case 'warning': return AlertTriangle;
        default: return Info;
    }
};

const getColorClass = (type: Notification['type']) => {
    switch (type) {
        case 'success': return 'text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20';
        case 'error': return 'text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20';
        case 'warning': return 'text-[#F0B90B] bg-[#F0B90B]/10 border-[#F0B90B]/20';
        default: return 'text-[#2962FF] bg-[#2962FF]/10 border-[#2962FF]/20';
    }
};
</script>

<template>
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-[320px]">
        <TransitionGroup 
            name="toast"
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform translate-y-4 opacity-0 scale-95"
            enter-to-class="transform translate-y-0 opacity-100 scale-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
        >
            <div 
                v-for="toast in visibleToasts" 
                :key="toast.id"
                :class="cn(
                    'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl relative overflow-hidden',
                    getColorClass(toast.type)
                )"
            >
                <!-- Progress bar -->
                <div class="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 animate-shrink" :style="{ animationDuration: TOAST_DURATION + 'ms' }"></div>
                
                <component :is="getIcon(toast.type)" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-black uppercase tracking-widest mb-1">{{ toast.title }}</h4>
                    <p class="text-[11px] font-medium opacity-90 leading-relaxed">{{ toast.message }}</p>
                </div>

                <button 
                    @click="removeToast(toast.id)"
                    class="p-1 -mr-1 -mt-1 opacity-50 hover:opacity-100 transition-opacity"
                >
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
@keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
}
.animate-shrink {
    animation-name: shrink;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
}
</style>
