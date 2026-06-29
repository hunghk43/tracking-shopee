import type { TrackResult, TrackHistory, CallLog, SmsLog } from "@/types";

const HTTP_TIMEOUT = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DELIVERED_KEYWORDS = [
  "đã giao",
  "giao thành công",
  "delivered",
  "completed",
  "hoàn thành",
];

function isDeliveredStatus(status: string): boolean {
  if (!status) return false;
  const low = status.toLowerCase();
  return DELIVERED_KEYWORDS.some((kw) => low.includes(kw));
}

function fmtIso(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null;
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return isoStr.slice(0, 19);
    // Dùng Intl để format đúng múi giờ VN, không tự cộng UTC+7
    return dt.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour12: false,
    });
  } catch {
    return isoStr.slice(0, 19);
  }
}

function fmtTimestamp(ts: number | string | null | undefined): string | null {
  if (!ts) return null;
  try {
    const d = new Date(Number(ts) * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour12: false,
    });
  } catch {
    return null;
  }
}

// ==================== GHN ====================
export async function trackGhn(code: string): Promise<TrackResult> {
  code = code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Mã trống" };

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    Referer: `https://donhang.ghn.vn/?order_code=${code}`,
    Origin: "https://donhang.ghn.vn",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  const base =
    "https://fe-online-gateway.ghn.vn/order-tracking/public-api/client";

  // 1. Tracking logs
  let mainData: Record<string, unknown>;
  try {
    const res = await fetch(`${base}/tracking-logs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_code: code }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    mainData = await res.json();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Không kết nối được: ${msg}` };
  }

  if ((mainData as { code?: number }).code !== 200) {
    return {
      ok: false,
      error:
        (mainData as { message?: string }).message || "Không tìm thấy đơn",
    };
  }

  const payloadData = ((mainData as { data?: Record<string, unknown> }).data ||
    {}) as Record<string, unknown>;
  const orderInfo = ((payloadData.order_info as Record<string, unknown>) ||
    {}) as Record<string, unknown>;
  const trackingLogs = (payloadData.tracking_logs as unknown[]) || [];

  if (!trackingLogs.length && !Object.keys(orderInfo).length) {
    return { ok: false, error: "Đơn GHN này chưa có dữ liệu" };
  }

  // 2. Call logs
  let callLogs: Record<string, unknown>[] = [];
  try {
    const r2 = await fetch(`${base}/call-logs?order_code=${code}`, {
      headers,
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (r2.ok) {
      const d2 = await r2.json();
      if (d2.code === 200 && Array.isArray(d2.data)) callLogs = d2.data;
    }
  } catch { /* ignore */ }

  // 3. SMS logs
  let smsLogs: Record<string, unknown>[] = [];
  try {
    const r3 = await fetch(`${base}/sms-logs?order_code=${code}`, {
      headers,
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (r3.ok) {
      const d3 = await r3.json();
      if (d3.code === 200 && Array.isArray(d3.data)) smsLogs = d3.data;
    }
  } catch { /* ignore */ }

  const currentStatus =
    (orderInfo.status_name as string) || "Không rõ";
  const currentStatusRaw = (orderInfo.status as string) || "";

  const sorted = [...(trackingLogs as Record<string, unknown>[])].sort((a, b) =>
    ((a.action_at as string) || "").localeCompare(
      (b.action_at as string) || ""
    )
  );

  const latestTime = sorted.length
    ? fmtIso(sorted[sorted.length - 1].action_at as string)
    : null;

  const history: TrackHistory[] = sorted.map((log) => {
    const locObj = log.location as Record<string, unknown> | null;
    return {
      time: fmtIso(log.action_at as string) || "",
      status: (log.status_name as string) || "",
      location:
        (locObj && typeof locObj === "object"
          ? (locObj.address as string)
          : "") || "",
    };
  });

  // Format call logs
  const formattedCalls: CallLog[] = callLogs.map((cl) => {
    const t = fmtIso(
      (cl.created_at || cl.called_at || cl.action_at || cl.time) as string
    );
    const employee = (cl.employee_name as string) || "";
    const phoneCall = (cl.phone_call as string) || "";
    const phoneRecv = (cl.phone_receive as string) || "";
    const duration = cl.duration ? Number(cl.duration) : 0;
    const ringDuration = cl.ring_duration ? Number(cl.ring_duration) : 0;
    const callType = (cl.type as string) || "";

    const typeLabel =
      callType === "DELIVER"
        ? "Giao hàng"
        : callType === "PICKUP"
          ? "Lấy hàng"
          : callType;

    let header = employee;
    if (typeLabel) header = header ? `${header} (${typeLabel})` : typeLabel;

    const parts: string[] = [];
    if (phoneCall && phoneRecv) parts.push(`${phoneCall} → ${phoneRecv}`);
    else if (phoneRecv) parts.push(`Gọi đến ${phoneRecv}`);

    if (duration > 0) parts.push(`Đàm thoại ${duration}s`);
    else if (ringDuration > 0)
      parts.push(`Đổ chuông ${ringDuration}s, không nghe máy`);

    const detail = parts.join(" · ");
    const note = (cl.content || cl.note) as string | undefined;

    let content = header && detail ? `${header}\n  ${detail}` : header || detail || "Cuộc gọi";
    if (note) content += `\n  💭 ${note}`;

    return { time: t || "", content };
  });

  // Format SMS logs
  const formattedSms: SmsLog[] = smsLogs.map((sl) => {
    const t = fmtIso(
      (sl.created_at || sl.sent_at || sl.action_at || sl.time) as string
    );
    const employee = (sl.employee_name as string) || "";
    const phoneRecv =
      (sl.phone_receive || sl.to_number || sl.phone) as string | undefined;
    let msg = (sl.content || sl.message || sl.text) as string | undefined;
    const smsType = (sl.type as string) || "";

    const typeLabel =
      smsType === "DELIVER"
        ? "Giao hàng"
        : smsType === "PICKUP"
          ? "Lấy hàng"
          : "";

    if (msg && msg.length > 200) msg = msg.slice(0, 197) + "...";

    let header = employee;
    if (typeLabel) header = header ? `${header} (${typeLabel})` : typeLabel;

    const recvInfo = phoneRecv ? `→ ${phoneRecv}` : "";
    let content: string;
    if (header && msg)
      content = `${header} ${recvInfo}`.trim() + `\n  💬 ${msg}`;
    else if (msg)
      content = recvInfo ? `${recvInfo}\n  💬 ${msg}` : `💬 ${msg}`;
    else content = "SMS";

    return { time: t || "", content };
  });

  const delivered =
    currentStatusRaw === "delivered" ||
    currentStatusRaw === "delivery_success" ||
    isDeliveredStatus(currentStatus);

  return {
    ok: true,
    status: currentStatus,
    status_time: latestTime,
    is_delivered: delivered,
    history,
    call_logs: formattedCalls,
    sms_logs: formattedSms,
    order_info: orderInfo,
    error: undefined,
  };
}

// ==================== SPX ====================
export async function trackSpx(code: string): Promise<TrackResult> {
  code = code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Mã trống" };

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    Referer: `https://tramavandon.com/spx/?tracking_number=${code}`,
    Origin: "https://tramavandon.com",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  let data: Record<string, unknown>;
  try {
    const res = await fetch("https://tramavandon.com/api/spx.php", {
      method: "POST",
      headers,
      body: JSON.stringify({ tracking_id: code }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    data = await res.json();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Không kết nối được: ${msg}` };
  }

  if ((data as { retcode?: number }).retcode !== 0) {
    return {
      ok: false,
      error: (data as { message?: string }).message || "Không tìm thấy đơn",
    };
  }

  const slsInfo = (
    (data.data as Record<string, unknown>)?.sls_tracking_info as Record<
      string,
      unknown
    >
  ) || {};
  const records = (slsInfo.records as Record<string, unknown>[]) || [];

  // Mã đơn Shopee (client_order_id)
  const shopeeOrderId = (slsInfo.client_order_id as string) || undefined;

  if (!records.length) {
    return { ok: false, error: "Đơn này chưa có dữ liệu hành trình" };
  }

  const latest = records[0];
  const statusLabel =
    (latest.buyer_description ||
      latest.description ||
      latest.tracking_name) as string || "Không rõ trạng thái";

  const statusTime = fmtTimestamp(
    latest.actual_time as number | string | null
  );

  const history: TrackHistory[] = [];
  for (const ev of [...records].reverse()) {
    if (
      (ev.display_flag as number) === 0 &&
      (ev.display_flag_v2 as number) === 0
    )
      continue;
    const t = fmtTimestamp(ev.actual_time as number | string | null) || "";
    const desc = ((ev.buyer_description || ev.description) as string) || "";

    // current_location hoặc next_location (SPX thường để current trống, next mới có data)
    const curLoc = ev.current_location as Record<string, unknown> | null;
    const nextLoc = ev.next_location as Record<string, unknown> | null;
    const loc = (curLoc?.location_name as string) ||
                (curLoc?.full_address as string) || "";
    const nextLocStr = (nextLoc?.full_address as string) ||
                       (nextLoc?.location_name as string) || "";
    const nextLat = (nextLoc?.lat as string) || undefined;
    const nextLng = (nextLoc?.lng as string) || undefined;

    // Lý do (nếu có, vd: "Không lấy kịp")
    const reason = (ev.reason_desc as string) || "";

    history.push({
      time: t,
      status: desc,
      location: loc,
      next_location: nextLocStr || undefined,
      next_lat: nextLat && nextLat !== "" ? nextLat : undefined,
      next_lng: nextLng && nextLng !== "" ? nextLng : undefined,
      milestone_code: (ev.milestone_code as number) || undefined,
      reason: reason || undefined,
    });
  }

  const currentMilestone = (latest.milestone_code as number) || 0;

  const delivered =
    (latest.milestone_code as number) === 8 ||
    (latest.tracking_code as string) === "F980" ||
    isDeliveredStatus(statusLabel);

  return {
    ok: true,
    status: statusLabel,
    status_time: statusTime,
    is_delivered: delivered,
    history,
    call_logs: [],
    sms_logs: [],
    milestone_code: currentMilestone,
    shopee_order_id: shopeeOrderId,
    error: undefined,
  };
}

export async function doTrack(
  carrier: string,
  code: string
): Promise<TrackResult> {
  if (carrier === "ghn") return trackGhn(code);
  if (carrier === "spx") return trackSpx(code);
  return { ok: false, error: "Không hỗ trợ hãng này." };
}

export function detectCarrier(code: string): "spx" | "ghn" | null {
  const upper = code.trim().toUpperCase();
  if (upper.startsWith("SPX")) return "spx";
  // GHN thường bắt đầu bằng chữ cái và dài 8-12 ký tự
  if (/^[A-Z0-9]{8,12}$/.test(upper)) return "ghn";
  return null;
}

export function carrierDisplay(carrier: string): string {
  return (
    { ghn: "GHN", spx: "SPX (Shopee Express)" }[carrier] ||
    carrier.toUpperCase()
  );
}

export function isStatusDone(
  status: string | null,
  isDeliveredFlag: boolean
): boolean {
  if (isDeliveredFlag) return true;
  const s = (status || "").toLowerCase();
  return (
    s.includes("giao hàng thành công") ||
    s.includes("delivered") ||
    s.includes("huỷ") ||
    s.includes("hủy") ||
    s.includes("cancel") ||
    s.includes("hoàn") ||
    s.includes("trả về") ||
    s.includes("return")
  );
}

export function isStatusCancelledOrReturned(status: string | null): boolean {
  const s = (status || "").toLowerCase();
  return (
    s.includes("huỷ") ||
    s.includes("hủy") ||
    s.includes("cancel") ||
    s.includes("hoàn") ||
    s.includes("trả về") ||
    s.includes("return")
  );
}
