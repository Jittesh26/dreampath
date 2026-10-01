import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    return createBrowserClient(supabaseUrl, supabaseKey);
  }

  // Graceful browser client fallback
  return {
    auth: {
      async getUser() {
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/dreampath_session=([^;]+)/);
          if (match) {
            try {
              const user = JSON.parse(decodeURIComponent(match[1]));
              return { data: { user }, error: null };
            } catch {}
          }
        }
        return { data: { user: null }, error: null };
      },
      async signOut() {
        if (typeof document !== 'undefined') {
          document.cookie = 'dreampath_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
        return { error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  } as any;
}
