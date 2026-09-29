import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('mock') && !supabaseUrl.includes('your-project')) {
    try {
      return createBrowserClient(supabaseUrl, supabaseKey);
    } catch {}
  }

  // Safe browser mock client
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  } as any;
}
