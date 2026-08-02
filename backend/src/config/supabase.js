import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Supabase созланмаган: SUPABASE_URL ва SUPABASE_SERVICE_KEY керак.'
  );
}

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

export function assertSupabaseConfigured() {
  if (!supabaseAdmin) {
    const error = new Error(
      'Supabase Storage созланмаган. Railway Variables ичида SUPABASE_URL ва SUPABASE_SERVICE_KEY мавжудлигини текширинг.'
    );

    error.status = 503;
    throw error;
  }
}
