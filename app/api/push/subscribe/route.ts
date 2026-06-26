import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST /api/push/subscribe  body: { user_id, subscription }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { user_id, subscription } = body;
  if (!user_id || !subscription)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const sb = createServerSupabase();

  // Upsert subscription vào bảng push_subscriptions
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      user_id,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Lưu subscription thất bại" }, { status: 500 });
  }

  return NextResponse.json({ message: "subscribed" });
}

// DELETE /api/push/subscribe  body: { endpoint }
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { endpoint } = body;
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const sb = createServerSupabase();
  await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return NextResponse.json({ message: "unsubscribed" });
}
