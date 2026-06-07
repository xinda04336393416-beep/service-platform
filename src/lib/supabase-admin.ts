import { createClient } from '@supabase/supabase-js'

// 仅用于服务端 API Route，持有完整权限，不要在客户端引用
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
