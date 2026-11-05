import { prisma } from "@tdoe/db";

import { verifyStaffSession } from "@/lib/auth/session";

export type StaffUser = { id: string; name: string; email: string };

// Authoritative check: besides the token signature, the staff account must
// still exist in the database, so deleting an account revokes its sessions.
export async function getStaffFromToken(
  token: string | undefined,
): Promise<StaffUser | null> {
  const session = await verifyStaffSession(token);
  if (!session) return null;

  return prisma.staff.findUnique({
    where: { id: session.staffId },
    select: { id: true, name: true, email: true },
  });
}
