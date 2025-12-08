// Runtime config interface (injected by entrypoint.sh in production)
interface RuntimeConfig {
  VITE_AGENT_API_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
}

// Access runtime config from window (only available in production)
const runtimeConfig = (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) as RuntimeConfig | undefined;

export const env = {
  agentApiUrl: import.meta.env.VITE_AGENT_API_URL || runtimeConfig?.VITE_AGENT_API_URL || 'https://api.syntra.id',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || runtimeConfig?.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || runtimeConfig?.VITE_SUPABASE_PUBLISHABLE_KEY || '',
} as const;
