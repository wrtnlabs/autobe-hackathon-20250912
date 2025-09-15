import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete (archive) an existing billing adjustment for a billing invoice
 * (healthcare_platform_billing_adjustments).
 *
 * This operation performs a soft-deletion (archival) of a specific billing
 * adjustment record associated with a given billing invoice. Instead of
 * permanently removing the record, it updates the 'deleted_at' timestamp for
 * compliance and audit retention policies. Only the admin of the organization
 * that owns the target invoice may perform this operation.
 *
 * Steps:
 *
 * 1. Validate the billing adjustment exists, is not already deleted, and is linked
 *    to the target invoice.
 * 2. Ensure the invoice exists and belongs to the same organization as the admin
 *    performing the request.
 * 3. Soft-delete (update 'deleted_at' of) the adjustment to the current UTC ISO
 *    timestamp (using toISOStringSafe).
 *
 * @param props - Object containing the authenticated admin payload and
 *   adjustment/invoice IDs
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the deletion
 * @param props.billingInvoiceId - The invoice UUID containing the adjustment
 * @param props.billingAdjustmentId - The adjustment UUID to be soft-deleted
 * @returns Void
 * @throws {Error} When the billing adjustment is not found, already deleted,
 *   invoice not found, or invoice not owned by the admin's organization.
 */
export async function deletehealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingAdjustmentsBillingAdjustmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingAdjustmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, billingInvoiceId, billingAdjustmentId } = props;

  // Step 1: Find the adjustment and ensure it's not already deleted and matches invoice
  const adjustment =
    await MyGlobal.prisma.healthcare_platform_billing_adjustments.findFirst({
      where: {
        id: billingAdjustmentId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!adjustment) {
    throw new Error("Billing adjustment not found or already deleted.");
  }

  // Step 2: Find invoice and check org ownership
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Billing invoice not found.");
  }
  if (invoice.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Invoice does not belong to your organization.");
  }

  // Step 3: Perform soft-delete by updating deleted_at
  await MyGlobal.prisma.healthcare_platform_billing_adjustments.update({
    where: { id: billingAdjustmentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
