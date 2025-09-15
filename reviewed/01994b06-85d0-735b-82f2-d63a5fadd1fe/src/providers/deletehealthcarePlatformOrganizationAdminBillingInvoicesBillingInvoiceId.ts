import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete a billing invoice by ID (IHealthcarePlatformBillingInvoice)
 *
 * Soft-deletes a billing invoice in the healthcare platform by updating its
 * `deleted_at` column to the current timestamp. This ensures the record remains
 * in the database for auditability and compliance, but is excluded from normal
 * workflows.
 *
 * Only authorized organization administrators may perform this operation. If
 * the invoice does not exist or is already deleted, an error is thrown. No data
 * is permanently removed.
 *
 * @param props - The request object containing organization admin credentials
 *   and the billing invoice ID
 * @param props.organizationAdmin - The authenticated organization admin user
 *   (payload)
 * @param props.billingInvoiceId - UUID of the billing invoice to be
 *   soft-deleted
 * @returns Void
 * @throws {Error} If the billing invoice does not exist or is already deleted
 */
export async function deletehealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { billingInvoiceId } = props;
  // Find active invoice (must not be already soft-deleted)
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Billing invoice not found or already deleted");
  }
  // Perform soft delete
  await MyGlobal.prisma.healthcare_platform_billing_invoices.update({
    where: { id: billingInvoiceId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
