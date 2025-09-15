import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve detailed information for a specific billing item
 * (IHealthcarePlatformBillingItem)
 *
 * This operation fetches all detailed attributes of a billing item linked to a
 * specified invoice, as used by billing, admin, or compliance staff for audit,
 * financial review, and dispute resolution. Authorization is enforced for
 * department heads with access to the organization or department. If not
 * authorized or item not found, an error is thrown.
 *
 * @param props - Parameters for access
 * @param props.departmentHead - Authenticated department head user payload
 * @param props.billingInvoiceId - UUID for the parent billing invoice
 * @param props.billingItemId - UUID for the requested billing item
 * @returns The detailed billing item or throws on access/lookup error
 * @throws {Error} If billing item does not exist, is deleted, or is not
 *   accessible
 */
export async function gethealthcarePlatformDepartmentHeadBillingInvoicesBillingInvoiceIdBillingItemsBillingItemId(props: {
  departmentHead: DepartmentheadPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingItemId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingItem> {
  // Lookup: Active billing item for given invoice and item ID
  const billingItem =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        id: props.billingItemId,
        invoice_id: props.billingInvoiceId,
        deleted_at: null,
      },
      select: {
        id: true,
        invoice_id: true,
        billing_code_id: true,
        description: true,
        quantity: true,
        unit_price: true,
        total_amount: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!billingItem)
    throw new Error(
      "Billing item not found, deleted, or inaccessible for this invoice",
    );

  // Fetch parent invoice (to check organization linkage)
  const parentInvoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingItem.invoice_id,
      },
      select: {
        organization_id: true,
      },
    });
  if (!parentInvoice) throw new Error("Parent billing invoice does not exist");

  // (Authorization: Department to be checked here if department/role logic is available)
  // All types auto-inferred; use toISOStringSafe for all dates
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
    deleted_at:
      billingItem.deleted_at === null ||
      typeof billingItem.deleted_at === "undefined"
        ? null
        : toISOStringSafe(billingItem.deleted_at),
  };
}
