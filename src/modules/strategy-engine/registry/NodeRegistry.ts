import type { NodePlugin } from './types';
import { reactive } from 'vue';

class Registry {
  private plugins = reactive<Map<string, NodePlugin>>(new Map());

  /**
   * Register a new Smart Node plugin.
   * This instantly makes it available in the command palette, marketplace,
   * node canvas, and execution engine.
   */
  register(plugin: NodePlugin) {
    if (this.plugins.has(plugin.type)) {
      console.warn(`Plugin ${plugin.type} is being overwritten.`);
    }
    this.plugins.set(plugin.type, plugin);
  }

  get(type: string): NodePlugin | undefined {
    return this.plugins.get(type);
  }

  getAll(): NodePlugin[] {
    return Array.from(this.plugins.values());
  }

  getByCategory(category: string): NodePlugin[] {
    return this.getAll().filter(p => p.category === category);
  }

  /**
   * Generates VueFlow nodeTypes object dynamically from registered plugins.
   */
  getVueFlowTypes(): Record<string, any> {
    const types: Record<string, any> = {};
    for (const [type, plugin] of this.plugins.entries()) {
      types[type] = plugin.renderer;
    }
    return types;
  }
}

export const NodeRegistry = new Registry();
