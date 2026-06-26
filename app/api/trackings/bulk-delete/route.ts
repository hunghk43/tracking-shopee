import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import {
  dbArchiveDelivered,
  dbArchiveCancelledReturned,
  dbListUser,
  dbGetStats,
} from "@/lib/db";

// POST /api/trackings/bulk-delete  body: { user_id, type: "delivered" | "cancelled" }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { user_id, type } = body;
  if (!user_id || !type)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const sb = createServerSupabase();
  let count = 0;

  if (type === "delivered") {
    count = await dbArchiveDelivered(sb, user_id);
  } else if (type === "cancelled") {
    count = await dbArchiveCancelledReturned(sb, user_id);
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const trackings = await dbListUser(sb, user_id);
  const stats = dbGetStats(trackings);

  return NextResponse.json({ message: "deleted", count, trackings, stats });
}
