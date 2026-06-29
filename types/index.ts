export type Carrier = "ghn" | "spx";

export interface Tracking {
  id: string;
  user_id: string;
  carrier: Carrier;
  tracking_code: string;
  nickname: string | null;
  last_status: string | null;
  last_status_time: string | null;
  last_checked_at: string | null;
  is_delivered: boolean;
  is_archived: boolean;
  created_at: string;
  display_id: number;
}

export interface TrackingStats {
  total: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

export interface TrackHistory {
  time: string;
  status: string;
  location: string;
  next_location?: string;
  milestone_code?: number;
  reason?: string;
}

export interface CallLog {
  time: string;
  content: string;
}

export interface SmsLog {
  time: string;
  content: string;
}

export interface TrackResult {
  ok: boolean;
  status?: string;
  status_time?: string | null;
  is_delivered?: boolean;
  history?: TrackHistory[];
  call_logs?: CallLog[];
  sms_logs?: SmsLog[];
  order_info?: Record<string, unknown>;
  milestone_code?: number;
  error?: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type FilterMode = "all" | "intransit" | "delivered" | "cancelled";
