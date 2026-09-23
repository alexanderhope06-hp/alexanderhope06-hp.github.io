

/* =====================================================
   STORYNEST - SUPABASE CONNECTION
   ===================================================== */

const SUPABASE_URL =
    "https://smvkexbzgobzpvndmdgh.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_1MwSnuh2Gjpb0G5GbuKdbw_vfF8qwsz";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );