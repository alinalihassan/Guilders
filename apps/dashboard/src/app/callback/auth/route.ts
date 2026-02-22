import type { NextRequest } from "next/server";

import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect_to") ?? "/";
  redirect(redirectTo);
}
