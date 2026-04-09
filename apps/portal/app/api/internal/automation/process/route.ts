import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function processQueue(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAutomationBatch(25);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return processQueue(request);
}

export async function POST(request: Request) {
  return processQueue(request);
}
