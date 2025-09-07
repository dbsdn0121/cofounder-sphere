"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestPage() {
  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error, count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (error) {
          console.error("❌ Supabase 연결 실패:", error);
        } else {
          console.log("✅ Supabase 연결 성공!");
          console.log("profiles 개수:", count);
        }
      } catch (err) {
        console.error("❌ 연결 테스트 실패:", err);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Supabase 연결 테스트 페이지</h1>
      <p>콘솔(F12 → Console 탭)을 확인하세요.</p>
    </div>
  );
}
