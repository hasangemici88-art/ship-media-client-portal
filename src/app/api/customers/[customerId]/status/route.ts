import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { updateCustomerStatus } from "@/lib/sheets";
import { leadStatuses } from "@/lib/types";

const schema = z.object({
  status: z.enum(leadStatuses),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const body = schema.parse(await request.json());
  const result = await updateCustomerStatus(customerId, body.status);

  return NextResponse.json(result);
}
