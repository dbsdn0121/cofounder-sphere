// app/api/proposals/[id]/accept/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { receiver_id } = await req.json(); // 내 profiles.id
  const { id } = await params;

  const { data, error } = await supabase
    .rpc('accept_proposal_current', {
      p_proposal_id: id,
      p_receiver: receiver_id
    });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, project_id: data });
}
