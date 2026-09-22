

/* =====================================================
   STORYNEST - SUPABASE CONNECTION
   ===================================================== */

const SUPABASE_URL =
    "https://cddiifvhdnaeabfdowhj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_JEL9oQPTOWwFtxvM7AdnXw_13zaBggG";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );