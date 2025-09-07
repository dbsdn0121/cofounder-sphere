// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,       // 같은 URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!       // 서비스 롤 키(절대 브라우저에서 쓰지 말기)
);
