import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing billing item linked to an invoice
 * (IHealthcarePlatformBillingItem)
 *
 * This endpoint updates an existing billing item row under a given invoice in
 * the healthcare_platform_billing_items table. It allows billing staff and
 * organization administrators to correct errors (quantities/prices), apply new
 * item codes, or adjust billing description and values per business,
 * compliance, or audit needs. All edits are subject to role-based authorization
 * (enforced upstream), business rules, and full audit logging. Date fields are
 * always handled as ISO8601 strings, UUIDs are generated with v4, and
 * input/return types are strictly typed with branding and without native Date
 * usage.
 *
 * @param props - Props for updating the billing item.
 * @param props.organizationAdmin - The authenticated organization admin making
 *   this request.
 * @param props.billingInvoiceId - UUID of the parent invoice (must match the
 *   item's invoice_id).
 * @param props.billingItemId - UUID of the billing item to update.
 * @param props.body - The requested updates (description, quantity, unit_price,
 *   total_amount).
 * @returns Return value is the updated billing item, strictly matching
 *   IHealthcarePlatformBillingItem, with all relevant fields (dates branded as
 *   ISO string, all types correct, no use of Date or 'as').
 * @throws {Error} If the targeted item does not exist, was soft-deleted, or
 *   business rules (negative/zero values) are violated.
 */
export async function puthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingItemsBillingItemId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingItemId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingItem.IUpdate;
}): Promise<IHealthcarePlatformBillingItem> {
  const { billingInvoiceId, billingItemId, body } = props;
  // Step 1: Fetch and verify existence (not soft-deleted, correct invoice)
  const billingItem =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        id: billingItemId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!billingItem) {
    throw new Error("Billing item not found or has been deleted.");
  }

  // Step 2: Enforce all business rules for updateable fields (minimums, negative checks)
  if (body.quantity !== undefined && body.quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }
  if (body.unit_price !== undefined && body.unit_price < 0) {
    throw new Error("Unit price cannot be negative.");
  }
  if (body.total_amount !== undefined && body.total_amount < 0) {
    throw new Error("Total amount cannot be negative.");
  }

  // Step 3: Perform patch update of allowed fields and always update updated_at (no Date use, no as/type assertion)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_items.update({
      where: { id: billingItemId },
      data: {
        description: body.description ?? undefined,
        quantity: body.quantity ?? undefined,
        unit_price: body.unit_price ?? undefined,
        total_amount: body.total_amount ?? undefined,
        updated_at: now,
      },
    });

  // Step 4: Return strict DTO matching type requirements with branding for all date fields, no as
  return {
    id: updated.id,
    invoice_id: updated.invoice_id,
    billing_code_id: updated.billing_code_id,
    description: updated.description,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_amount: updated.total_amount,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
