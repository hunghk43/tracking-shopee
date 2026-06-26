import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { dbGetToCheck, dbUpdateStatus, dbMarkChecked, dbAutoArchiveOld } from "@/lib/db";
import { doTrack } from "@/lib/tracker";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lazy-load web-push để tránh lỗi build-time khi VAPID keys chưa set
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWebPush(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wp = require("web-push");
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    wp.setVapidDetails(
      process.env.VAPID_MAILTO || "mailto:admin@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
  return wp;
}

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: không cần secret
  return authHeader === `Bearer ${secret}`;
}

async function sendPushNotification(
  sb: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  try {
    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, keys")
      .eq("user_id", userId);

    if (!subs || !subs.length) return;

    const wp = getWebPush();
    const payload = JSON.stringify({ title, body, data: data || {} });

    await Promise.allSettled(
      subs.map((sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
        wp
          .sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
          .catch(async (err: { statusCode?: number }) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          })
      )
    );
  } catch (e) {
    console.error("Push notification error:", e);
  }
}

export const maxDuration = 55; // Vercel Hobby max = 60s, để dư 5s

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServerSupabase();

  await dbAutoArchiveOld(sb);

  const items = await dbGetToCheck(sb, 50); // Giới hạn 50 đơn/lần để tránh timeout 60s
  console.log(`[CRON] Checking ${items.length} trackings...`);

  let updated = 0;
  const results: { id: string; code: string; status: string; changed: boolean }[] = [];

  for (const t of items) {
    try {
      const result = await doTrack(t.carrier, t.tracking_code);

      if (!result.ok) {
        await dbMarkChecked(sb, t.id);
        continue;
      }

      const newStatus = result.status!;
      const oldStatus = t.last_status;

      await dbUpdateStatus(sb, t.id, newStatus, result.status_time || null, result.is_delivered!);

      const changed = !!oldStatus && newStatus !== oldStatus;

      if (changed) {
        updated++;
        const isDeliveredNow = result.is_delivered;
        const title = isDeliveredNow ? "🎉 Đơn hàng đã được giao!" : "🔔 Cập nhật vận đơn";
        const nick = t.nickname ? ` (${t.nickname})` : "";
        const bodyMsg = `Đơn #${t.display_id}${nick}: ${newStatus}`;

        await sendPushNotification(sb, t.user_id, title, bodyMsg, {
          display_id: t.display_id,
          tracking_code: t.tracking_code,
          carrier: t.carrier,
          old_status: oldStatus,
          new_status: newStatus,
        });
      }

      results.push({ id: t.id, code: t.tracking_code, status: newStatus, changed });

      // Delay nhỏ tránh rate limit
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`Error checking ${t.tracking_code}:`, e);
      await dbMarkChecked(sb, t.id);
    }
  }

  return NextResponse.json({ checked: items.length, updated, results });
}
