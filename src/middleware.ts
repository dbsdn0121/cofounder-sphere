// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 공개 라우트 (인증 없이 접근 가능)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)", // Clerk 웹훅은 공개여야 함
  "/api/projects", // GET 요청은 공개 (모든 프로젝트 조회)
]);

// 보호 라우트 (인증 필요)
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/find(.*)",
  "/matches(.*)",
  "/messages(.*)",
  "/profile(.*)",
  "/projects(.*)",
  "/searches(.*)",
  "/onboarding(.*)",
  "/api/dashboard(.*)",
  "/api/projects/[id](.*)", // 특정 프로젝트 수정/삭제는 인증 필요
  "/api/matches(.*)",
  "/api/messages(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // 공개 라우트는 바로 통과
  if (isPublicRoute(req)) return;

  // 보호 라우트에서만 인증 체크
  if (isProtectedRoute(req)) {
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      // API 요청인 경우 401 응답
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // 웹 페이지 요청인 경우 로그인 페이지로 리다이렉트
      return Response.redirect(new URL('/sign-in', req.url));
    }
  }

  // API projects 라우트의 특별 처리
  if (req.nextUrl.pathname === '/api/projects' && req.method === 'POST') {
    // POST 요청 (프로젝트 생성)은 인증 필요
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  // 그 외 라우트는 통과 (정적 파일 등)
});

export const config = {
  matcher: [
    // 다음을 제외한 모든 라우트에 미들웨어 적용:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public files with extensions
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // API routes
    "/(api|trpc)(.*)",
  ],
};