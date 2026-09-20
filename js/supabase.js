import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://pgnkpwhnrmjciqnfujjn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_F22XDwRFlSoUo_VsODx9gQ_XuJrSkQk';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
