/* =====================================================
   STORYNEST — SUPABASE CONNECTION
   Load the Supabase JS v2 browser SDK BEFORE this file.
   Load this file before login.js and auth.js.
   ===================================================== */

(function () {
    'use strict';

    const SUPABASE_URL = 'https://smvkexbzgobzpvndmdgh.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1MwSnuh2Gjpb0G5GbuKdbw_vfF8qwsz';
    const STORAGE_KEY = 'sb-smvkexbzgobzpvndmdgh-auth-token';

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('[StoryNest] Supabase SDK is missing. Load @supabase/supabase-js v2 before supabase.js.');
        window.storyNestSupabaseError = 'Supabase SDK did not load. Refresh the page or check the Supabase script.';
        return;
    }

    // Avoid creating multiple clients if this file is accidentally included twice.
    if (window.supabaseClient) return;

    try {
        const client = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage,
                    storageKey: STORAGE_KEY
                }
            }
        );

        // Explicit window property works reliably across classic scripts and modules.
        window.supabaseClient = client;
        window.storyNestSupabaseError = null;
    } catch (error) {
        console.error('[StoryNest] Could not initialize Supabase:', error);
        window.storyNestSupabaseError = 'Could not initialize Supabase. Check the browser console and storage settings.';
    }
})();
