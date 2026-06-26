/**
 * Database helpers dùng Supabase (server-side only)
 * Tất cả hàm đều nhận supabase client từ ngoài vào để tái sử dụng.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tracking, TrackingStats } from "@/types";

export async function dbCountActive(
  sb: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await sb
    .from("trackings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false);
  return count || 0;
}

async function nextDisplayId(
  sb: SupabaseClient,
  userId: string,
  excludeId?: string
): Promise<number> {
  let query = sb
    .from("trackings")
    .select("display_id")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .not("display_id", "is", null)
    .order("display_id", { ascending: true });

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  const used = (data || []).map((r: { display_id: number }) => r.display_id);
  let expected = 1;
  for (const n of used) {
    if (n !== expected) return expected;
    expected++;
  }
  return expected;
}

export async function dbAddTracking(
  sb: SupabaseClient,
  userId: string,
  carrier: string,
  code: string,
  nickname: string | null
): Promise<{ realId: string; displayId: number } | null | "exists"> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(sb, userId);

  const { data, error } = await sb
    .from("trackings")
    .insert({
      user_id: userId,
      carrier,
      tracking_code: code,
      nickname,
      created_at: now,
      display_id: displayId,
      is_delivered: false,
      is_archived: false,
    })
    .select("id, display_id")
    .single();

  if (!error && data) {
    return { realId: data.id, displayId: data.display_id };
  }

  // Đã tồn tại (conflict) → unarchive
  if (error?.code === "23505") {
    const { data: existing } = await sb
      .from("trackings")
      .select("id, display_id, is_archived, nickname")
      .eq("user_id", userId)
      .eq("carrier", carrier)
      .eq("tracking_code", code)
      .single();

    if (!existing) return null;

    const newDispId =
      existing.is_archived || !existing.display_id
        ? await nextDisplayId(sb, userId, existing.id)
        : existing.display_id;

    await sb
      .from("trackings")
      .update({
        is_archived: false,
        nickname: nickname || existing.nickname,
        display_id: newDispId,
      })
      .eq("id", existing.id);

    return "exists";
  }

  return null;
}

export async function dbGetByDisplayId(
  sb: SupabaseClient,
  userId: string,
  displayId: number
): Promise<Tracking | null> {
  const { data } = await sb
    .from("trackings")
    .select("*")
    .eq("user_id", userId)
    .eq("display_id", displayId)
    .eq("is_archived", false)
    .single();
  return (data as Tracking) || null;
}

export async function dbGetById(
  sb: SupabaseClient,
  id: string,
  userId: string
): Promise<Tracking | null> {
  const { data } = await sb
    .from("trackings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as Tracking) || null;
}

export async function dbListUser(
  sb: SupabaseClient,
  userId: string,
  includeArchived = false
): Promise<Tracking[]> {
  let query = sb
    .from("trackings")
    .select("*")
    .eq("user_id", userId)
    .order("is_delivered", { ascending: true })
    .order("created_at", { ascending: false });

  if (!includeArchived) query = query.eq("is_archived", false);

  const { data } = await query;
  return (data as Tracking[]) || [];
}

export async function dbUpdateStatus(
  sb: SupabaseClient,
  id: string,
  status: string,
  statusTime: string | null,
  isDelivered: boolean
): Promise<void> {
  await sb
    .from("trackings")
    .update({
      last_status: status,
      last_status_time: statusTime,
      last_checked_at: new Date().toISOString(),
      is_delivered: isDelivered,
    })
    .eq("id", id);
}

export async function dbMarkChecked(
  sb: SupabaseClient,
  id: string
): Promise<void> {
  await sb
    .from("trackings")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", id);
}

export async function dbUpdateNickname(
  sb: SupabaseClient,
  id: string,
  userId: string,
  nickname: string | null
): Promise<boolean> {
  const { error } = await sb
    .from("trackings")
    .update({ nickname })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function dbArchive(
  sb: SupabaseClient,
  id: string,
  userId: string
): Promise<boolean> {
  const { error } = await sb
    .from("trackings")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function dbArchiveDelivered(
  sb: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await sb
    .from("trackings")
    .select("id, last_status")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (!data) return 0;

  const toArchive = data
    .filter((t: { id: string; last_status: string | null; is_delivered?: boolean }) => {
      const s = (t.last_status || "").toLowerCase();
      return (
        (t as { is_delivered?: boolean }).is_delivered ||
        s.includes("giao hàng thành công") ||
        s.includes("delivered")
      );
    })
    .map((t: { id: string }) => t.id);

  if (!toArchive.length) return 0;

  await sb
    .from("trackings")
    .update({ is_archived: true })
    .in("id", toArchive);

  return toArchive.length;
}

export async function dbArchiveCancelledReturned(
  sb: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await sb
    .from("trackings")
    .select("id, last_status")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (!data) return 0;

  const toArchive = data
    .filter((t: { id: string; last_status: string | null }) => {
      const s = (t.last_status || "").toLowerCase();
      return (
        s.includes("huỷ") ||
        s.includes("hủy") ||
        s.includes("cancel") ||
        s.includes("hoàn") ||
        s.includes("trả về") ||
        s.includes("return")
      );
    })
    .map((t: { id: string }) => t.id);

  if (!toArchive.length) return 0;

  await sb
    .from("trackings")
    .update({ is_archived: true })
    .in("id", toArchive);

  return toArchive.length;
}

export async function dbAutoArchiveOld(
  sb: SupabaseClient,
  days = 30
): Promise<void> {
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();
  await sb
    .from("trackings")
    .update({ is_archived: true })
    .eq("is_delivered", true)
    .eq("is_archived", false)
    .lt("last_checked_at", cutoff);
}

export async function dbGetToCheck(
  sb: SupabaseClient,
  limit = 200
): Promise<Tracking[]> {
  const { data } = await sb
    .from("trackings")
    .select("*")
    .eq("is_archived", false)
    .eq("is_delivered", false)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (!data) return [];

  // Lọc thêm bằng JS (Supabase không hỗ trợ NOT LIKE tốt với tiếng Việt)
  return (data as Tracking[]).filter((t) => {
    const s = (t.last_status || "").toLowerCase();
    return (
      !s.includes("huỷ") &&
      !s.includes("hủy") &&
      !s.includes("cancel") &&
      !s.includes("hoàn") &&
      !s.includes("trả về") &&
      !s.includes("return")
    );
  });
}

export function dbGetStats(trackings: Tracking[]): TrackingStats {
  const stats: TrackingStats = {
    total: trackings.length,
    in_transit: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };

  for (const t of trackings) {
    const s = (t.last_status || "").toLowerCase();
    if (
      t.is_delivered ||
      s.includes("giao hàng thành công") ||
      s.includes("delivered")
    ) {
      stats.delivered++;
    } else if (s.includes("huỷ") || s.includes("hủy") || s.includes("cancel")) {
      stats.cancelled++;
    } else if (s.includes("hoàn") || s.includes("trả về") || s.includes("return")) {
      stats.returned++;
    } else {
      stats.in_transit++;
    }
  }

  return stats;
}
