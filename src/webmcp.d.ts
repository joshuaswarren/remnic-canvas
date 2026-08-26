/**
 * Minimal typings for the experimental WebMCP proposal
 * (https://github.com/webmachinelearning/webmcp). Replace with the
 * `webmcp-types` package once its shape is confirmed against the
 * browsers we target; keep this file authoritative until then.
 */
interface ModelContextToolDescriptor {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface ModelContext {
  registerTool?: (tool: ModelContextToolDescriptor) => void | Promise<void>;
  unregisterTool?: (name: string) => void | Promise<void>;
  provideContext?: (context: { tools: ModelContextToolDescriptor[] }) => void | Promise<void>;
}

interface Document {
  modelContext?: ModelContext;
}

interface Navigator {
  modelContext?: ModelContext;
}
