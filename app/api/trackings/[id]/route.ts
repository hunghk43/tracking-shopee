import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import {
  dbGetByDisplayId,
  dbArchive,
  dbUpdateNickname,
  dbUpdateStatus,
  dbGetStats,
  dbListUser,
} from "@/lib/db";
import { doTrack } from "@/lib/tracker";

// DELETE /api/trackings/[id]?user_id=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const displayId = parseInt(id);
  if (isNaN(displayId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const sb = createServerSupabase();
  const tracking = await dbGetByDisplayId(sb, userId, displayId);
  if (!tracking)
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const ok = await dbArchive(sb, tracking.id, userId);
  if (!ok)
    return NextResponse.json({ error: "Xóa thất bại" }, { status: 500 });

  const trackings = await dbListUser(sb, userId);
  const stats = dbGetStats(trackings);
  return NextResponse.json({ message: "deleted", trackings, stats });
}

// PATCH /api/trackings/[id]  body: { user_id, nickname? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { user_id, nickname } = body;
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const displayId = parseInt(id);
  if (isNaN(displayId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const sb = createServerSupabase();
  const tracking = await dbGetByDisplayId(sb, user_id, displayId);
  if (!tracking)
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const ok = await dbUpdateNickname(
    sb,
    tracking.id,
    user_id,
    nickname !== undefined ? nickname : tracking.nickname
  );
  if (!ok)
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });

  return NextResponse.json({ message: "updated" });
}

// POST /api/trackings/[id]/check -> tra cứu ngay
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const user_id = body.user_id;
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const displayId = parseInt(id);
  if (isNaN(displayId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const sb = createServerSupabase();
  const tracking = await dbGetByDisplayId(sb, user_id, displayId);
  if (!tracking)
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const result = await doTrack(tracking.carrier, tracking.tracking_code);

  if (result.ok) {
    await dbUpdateStatus(
      sb,
      tracking.id,
      result.status!,
      result.status_time || null,
      result.is_delivered!
    );
  }

  return NextResponse.json({ result });
}
