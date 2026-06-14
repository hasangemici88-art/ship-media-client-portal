import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createLeadFromLivablinds, getCustomers } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const customers = await getCustomers();
  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const sharedSecret = process.env.LIVABLINDS_WEBHOOK_SECRET;
  if (!sharedSecret) {
    return NextResponse.json({ message: "Webhook secret is not configured." }, { status: 503 });
  }

  const incomingSecret = request.headers.get("x-livablinds-secret");
  if (incomingSecret !== sharedSecret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const customer = await createLeadFromLivablinds(body);

  return NextResponse.json({ customer }, { status: 201 });
}
