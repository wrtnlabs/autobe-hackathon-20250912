import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a billing invoice by ID (IHealthcarePlatformBillingInvoice)
 *
 * This operation performs a soft deletion of a billing invoice, marking its
 * deleted_at column to preserve it for compliance audit and regulatory
 * retention. The underlying record remains in the database, but is excluded
 * from active business use.
 *
 * Only authenticated system administrators can perform this action. If the
 * invoice doesn't exist or was already deleted, an error is thrown. Deletions
 * are tracked for audit compliance.
 *
 * @param props - Delete request containing:
 *
 *   - SystemAdmin: Authenticated SystemadminPayload (role-verified by decorator)
 *   - BillingInvoiceId: UUID of the billing invoice to delete
 *
 * @returns Void
 * @throws {Error} If the invoice doesn't exist or was already soft-deleted
 */
export async function deletehealthcarePlatformSystemAdminBillingInvoicesBillingInvoiceId(props: {
  systemAdmin: SystemadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { billingInvoiceId } = props;

  // Verify that the invoice exists and is not already deleted
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: { id: billingInvoiceId, deleted_at: null },
      select: { id: true },
    });
  if (!invoice) throw new Error("Invoice not found or already deleted");

  // Soft-delete (set deleted_at)
  await MyGlobal.prisma.healthcare_platform_billing_invoices.update({
    where: { id: billingInvoiceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // No return; success is void
}
