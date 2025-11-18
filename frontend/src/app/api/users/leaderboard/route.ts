import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "volume";
    const limit = searchParams.get("limit") || "100";

    // Proxy to Express backend
    const backendUrl = `${BACKEND_URL}/api/users/leaderboard?sortBy=${sortBy}&limit=${limit}`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to fetch leaderboard" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", details: error.message },
      { status: 500 }
    );
  }
}

