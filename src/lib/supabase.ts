// lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Clerk의 getToken 함수를 주입받아,
 * 매 요청마다 Authorization 헤더에 Clerk JWT를 실어주는
 * 브라우저용 Supabase 클라이언트를 생성한다.
 *
 * 사용 예:
 *   const { getToken } = useAuth();
 *   const supabase = createBrowserSupabase(() => getToken({ template: "supabase" }));
 */
export function createBrowserSupabase(
  getToken: (args?: { template?: string }) => Promise<string | null>
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // fetch 인터셉터: 매 호출 시 Clerk JWT를 Authorization 헤더로 주입
  const injectedFetch: typeof fetch = async (input, init) => {
    const token = await getToken?.({ template: "supabase" });
    const headers = new Headers(init?.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  };

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: injectedFetch,
    },
  });

  return client;
}

/**
 * Clerk userId(= JWT sub)로 profiles에서 사용자 프로필을 가져온다.
 * 없으면 null. 에러면 throw.
 */
export async function getCurrentUserProfileByClerk(
  supabase: SupabaseClient,
  clerkUserId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * 필요시: 프로필이 없으면 만들어주는 헬퍼 (선택)
 */
export async function ensureProfileByClerk(
  supabase: SupabaseClient,
  clerkUserId: string,
  defaults?: Record<string, any>
) {
  const current = await getCurrentUserProfileByClerk(supabase, clerkUserId);
  if (current) return current;

  const payload = {
    clerk_user_id: clerkUserId,
    ...(defaults || {}),
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
