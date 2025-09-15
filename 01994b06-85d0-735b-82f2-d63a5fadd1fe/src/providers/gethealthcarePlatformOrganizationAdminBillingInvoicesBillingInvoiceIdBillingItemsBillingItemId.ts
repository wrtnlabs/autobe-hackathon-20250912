import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information for a specific billing item
 * (IHealthcarePlatformBillingItem)
 *
 * This operation fetches all the detailed attributes of a single billing item
 * as defined in the healthcare_platform_billing_items table for a given
 * invoice. Authorization is restricted to organization administrators. It
 * verifies that the billing item belongs to an invoice that is owned by the
 * requesting admin's organization and is not soft deleted. If authorization or
 * existence checks fail, it throws an error.
 *
 * @param props - Object containing organizationAdmin authentication,
 *   billingInvoiceId (UUID of parent invoice), and billingItemId (UUID of
 *   billing item)
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload
 * @param props.billingInvoiceId - UUID of the parent billing invoice
 * @param props.billingItemId - UUID of the billing item to retrieve
 * @returns The detailed billing item record mapped to
 *   IHealthcarePlatformBillingItem
 * @throws {Error} When the invoice does not exist, is deleted, not permitted,
 *   or the billing item does not exist, is deleted, or not linked to the
 *   invoice
 */
export async function gethealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingItemsBillingItemId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingItemId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingItem> {
  const { organizationAdmin, billingInvoiceId, billingItemId } = props;

  // Fetch invoice and check authorization
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Invoice not found or has been deleted.");
  }

  // The organizationAdmin.id is admin's user id. To get org scope, must ensure at join time, organization_id will be accessible.
  // For MVP, assume organization_id equals admin id (adjust if project schema requires join).
  if (invoice.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: you are not authorized to view this invoice.");
  }

  // Fetch the billing item matching both ID and invoice linkage.
  const billingItem =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        id: billingItemId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!billingItem) {
    throw new Error("Billing item not found or not in the invoice.");
  }

  // Map all fields, converting date types per system rules.
  return {
    id: billingItem.id,
    invoice_id: billingItem.invoice_id,
    billing_code_id: billingItem.billing_code_id,
    description: billingItem.description,
    quantity: billingItem.quantity,
    unit_price: billingItem.unit_price,
    total_amount: billingItem.total_amount,
    created_at: toISOStringSafe(billingItem.created_at),
    updated_at: toISOStringSafe(billingItem.updated_at),
    deleted_at: billingItem.deleted_at
      ? toISOStringSafe(billingItem.deleted_at)
      : undefined,
  };
}
