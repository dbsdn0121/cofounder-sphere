import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * 기본 anon Supabase 클라이언트
 * - 클라이언트/서버 공용으로 가볍게 사용할 때
 * - 인증 토큰 주입 없이 public 정책으로 접근
 */
export const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Clerk의 getToken을 주입해, 매 요청에 Authorization 헤더(Clerk JWT)를 실어주는
 * 브라우저용 Supabase 클라이언트 생성기.
 *
 * 사용 예:
 *   const { getToken } = useAuth();
 *   const supa = createBrowserSupabase(() => getToken({ template: "supabase" }));
 */
export function createBrowserSupabase(
  getToken: (args?: { template?: string }) => Promise<string | null>
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 매 호출 시 Clerk JWT를 Authorization 헤더로 주입하는 fetch 래퍼
  const injectedFetch: typeof fetch = async (input, init) => {
    const token = await getToken?.({ template: "supabase" });
    const headers = new Headers(init?.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: injectedFetch },
  });
}

/**
 * Clerk userId(= JWT sub) 로 profiles에서 사용자 프로필을 가져온다.
 * 없으면 null, 에러면 throw.
 */
export async function getCurrentUserProfileByClerk(
  client: SupabaseClient,
  clerkUserId: string
) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * 프로필이 없으면 생성하고, 있으면 기존 값을 반환.
 * defaults로 초기값을 추가 설정 가능.
 */
export async function ensureProfileByClerk(
  client: SupabaseClient,
  clerkUserId: string,
  defaults?: Record<string, unknown>
) {
  const current = await getCurrentUserProfileByClerk(client, clerkUserId);
  if (current) return current;

  const payload = {
    clerk_user_id: clerkUserId,
    ...(defaults || {}),
  };

  const { data, error } = await client
    .from("profiles")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
