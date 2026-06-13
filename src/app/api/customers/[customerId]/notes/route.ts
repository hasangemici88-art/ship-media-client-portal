import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { addCustomerNote } from "@/lib/sheets";

const schema = z.object({
  body: z.string().min(2).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const payload = schema.parse(await request.json());
  const note = await addCustomerNote(customerId, {
    id: crypto.randomUUID(),
    body: payload.body,
    userName: session.user?.name || session.user?.email || "Portal user",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ note }, { status: 201 });
}
