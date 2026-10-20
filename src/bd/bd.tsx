
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://haqezsbpofbwzychxwrh.supabase.co';

const supabaseKey = 'sb_publishable_6kk-Hjbp46ysEOEMWB3XzQ_4G-flr6r';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

