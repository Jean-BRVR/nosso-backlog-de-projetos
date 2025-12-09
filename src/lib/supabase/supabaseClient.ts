// supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// IMPORTANTE: Como já configurou o vite.config.ts para injetar variáveis de ambiente no process.env,
// vamos usar essa forma de acesso.
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis de ambiente do Supabase não estão definidas. Verifique o seu arquivo .env e vite.config.ts.");
}

// Inicializa e exporta o cliente Supabase para ser usado em outros arquivos.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
