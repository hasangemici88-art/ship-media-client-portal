import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { deleteCustomer, getCustomers } from "@/lib/db";
import { actorFromSession, canDeleteCustomers, canViewCustomer } from "@/lib/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = actorFromSession(session);
  if (!canDeleteCustomers(actor)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { customerId } = await params;
  const customer = (await getCustomers()).find((item) => item.customerId === customerId);
  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  if (!canViewCustomer(actor!, customer)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await deleteCustomer(customerId, actor!);
  return NextResponse.json(result);
}
