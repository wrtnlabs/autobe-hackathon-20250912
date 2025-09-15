import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a billing item from a specific billing invoice
 * (healthcare_platform_billing_items table)
 *
 * This operation soft-deletes a billing item (marks deleted_at timestamp) from
 * a healthcare platform invoice. It enforces that only an authorized
 * organization admin can perform this action, validates invoice and item
 * relationships, rejects deletion if already deleted or if parent invoice is
 * finalized/locked, and sets deleted_at to the current time. No data is
 * returned on success.
 *
 * @param props - The function props
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.billingInvoiceId - UUID of the parent invoice
 * @param props.billingItemId - UUID of the item to be deleted
 * @returns Void
 * @throws {Error} If the item does not exist, belongs to a different invoice,
 *   is already deleted, invoice is finalized/locked, or access is denied
 */
export async function deletehealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingItemsBillingItemId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization: Only organization admin allowed (payload provided by decorator, always correct type)

  // 1. Confirm the billing item exists (and not already deleted) and belongs to the specified invoice
  const item =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        id: props.billingItemId,
        deleted_at: null,
      },
      select: { id: true, invoice_id: true },
    });
  if (!item) throw new Error("Billing item not found or already deleted");
  if (item.invoice_id !== props.billingInvoiceId)
    throw new Error("Billing item does not belong to the specified invoice");

  // 2. Confirm the parent invoice is not finalized or locked
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findUnique({
      where: { id: props.billingInvoiceId },
      select: { id: true, status: true },
    });
  if (!invoice) throw new Error("Billing invoice not found");
  if (invoice.status === "finalized" || invoice.status === "locked")
    throw new Error(
      "Cannot delete billing item from a finalized or locked invoice",
    );

  // 3. Soft-delete the item by updating deleted_at (do not use Date directly)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_billing_items.update({
    where: { id: props.billingItemId },
    data: { deleted_at: deletedAt },
  });
}
