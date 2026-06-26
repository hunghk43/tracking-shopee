import { NextRequest, NextResponse } from "next/server";
import { doTrack, detectCarrier } from "@/lib/tracker";

// POST /api/track  body: { carrier?, tracking_code }
// Quick track không lưu DB — dùng cho tra cứu nhanh
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  let { carrier, tracking_code } = body;
  if (!tracking_code)
    return NextResponse.json({ error: "Missing tracking_code" }, { status: 400 });

  const code = String(tracking_code).trim().toUpperCase();
  if (code.length < 5 || code.length > 40)
    return NextResponse.json({ error: "Mã không hợp lệ (5–40 ký tự)" }, { status: 400 });

  // Auto detect nếu không truyền carrier
  if (!carrier) {
    carrier = detectCarrier(code);
    if (!carrier)
      return NextResponse.json(
        { error: "Không thể tự động nhận diện hãng. Vui lòng chọn GHN hoặc SPX." },
        { status: 400 }
      );
  }

  if (!["ghn", "spx"].includes(carrier))
    return NextResponse.json({ error: "Carrier không hợp lệ" }, { status: 400 });

  const result = await doTrack(carrier, code);
  return NextResponse.json({ result, carrier, code });
}
