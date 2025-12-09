// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis de ambiente com o prefixo 'VITE_' ou sem prefixo.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // INJEÇÃO DA CHAVE GEMINI (Antiga)
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
      
      // NOVAS INJEÇÕES DO SUPABASE (O que faltava)
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
  }
})