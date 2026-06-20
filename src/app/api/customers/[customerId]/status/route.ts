import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getCustomers, updateCustomerStatus } from "@/lib/db";
import { actorFromSession, canUpdateStatus, canViewCustomer } from "@/lib/permissions";
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

  const actor = actorFromSession(session);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const body = schema.parse(await request.json());

  if (!canUpdateStatus(actor, body.status)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const customer = (await getCustomers()).find((item) => item.customerId === customerId);
  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  if (!canViewCustomer(actor, customer)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await updateCustomerStatus(customerId, body.status, customer);

  return NextResponse.json(result);
}
