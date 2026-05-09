export interface NodeInput {
  id: string;
  name: string;
  type: string | string[]; // Accepted data types
}

export interface NodeOutput {
  id: string;
  name: string;
  type: string;
}

export type PropertyType = 'string' | 'number' | 'boolean' | 'enum' | 'json';

export interface NodeProperty {
  type: PropertyType;
  label: string;
  default?: any;
  options?: { value: string | number; label: string }[];
  description?: string;
}

export interface NodeSchema {
  [key: string]: NodeProperty;
}

/**
 * Smart Node Architecture
 * Represents the universal definition of a Node, supporting UI rendering,
 * parameter validation, execution logic, and inspector generation.
 */
export interface NodePlugin {
  // Unique identifier (e.g. 'rsi', 'macd', 'customAiModel')
  type: string;
  // Display name
  name: string;
  // Categorization for Palette
  category: string;
  // Node schema for automatic settings UI generation
  schema: NodeSchema;
  // Port definitions
  inputs: NodeInput[];
  outputs: NodeOutput[];
  
  // Renders the node block on the VueFlow canvas
  renderer: any; // Vue Component
  // Optional custom inspector UI component
  inspectorUI?: any; // Vue Component
  
  // Execution logic for backtesting / live trading engine
  executor: (context: any, nodeData: any, inputs: any) => Promise<any> | any;
}
