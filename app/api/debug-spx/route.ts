import { NextRequest, NextResponse } from "next/server";

// Endpoint tạm để xem raw SPX response
// GET /api/debug-spx?code=SPXVN...
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" });

  const res = await fetch("https://tramavandon.com/api/spx.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      Referer: `https://tramavandon.com/spx/?tracking_number=${code}`,
      Origin: "https://tramavandon.com",
    },
    body: JSON.stringify({ tracking_id: code }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
