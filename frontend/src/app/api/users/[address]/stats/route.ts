import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Proxy to Express backend
    const backendUrl = `${BACKEND_URL}/api/users/${address}/stats`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to fetch user stats" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("User stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats", details: error.message },
      { status: 500 }
    );
  }
}

