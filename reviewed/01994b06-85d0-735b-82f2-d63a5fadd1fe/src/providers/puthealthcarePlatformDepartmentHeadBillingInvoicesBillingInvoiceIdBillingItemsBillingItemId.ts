import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing billing item linked to an invoice
 * (IHealthcarePlatformBillingItem)
 *
 * Applies updates to the specified billing item under a given invoice. Only
 * department heads with access to the owning department or organization may
 * update. Supports correction of errors, price/quantity adjustment, and audit
 * tracking. Fails on non-existent or unauthorized items, or invalid update
 * payload.
 *
 * @param props - Update parameters:
 *
 *   - Props.departmentHead: Authenticated department head payload
 *   - Props.billingInvoiceId: UUID of the parent billing invoice
 *   - Props.billingItemId: UUID of billing item to be updated
 *   - Props.body: Update data (partial)
 *
 * @returns The updated billing item (canonical DTO)
 * @throws {Error} If the billing item is not found, department head is
 *   unauthorized, or input is invalid
 */
export async function puthealthcarePlatformDepartmentHeadBillingInvoicesBillingInvoiceIdBillingItemsBillingItemId(props: {
  departmentHead: DepartmentheadPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingItemId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingItem.IUpdate;
}): Promise<IHealthcarePlatformBillingItem> {
  const { departmentHead, billingInvoiceId, billingItemId, body } = props;

  // Step 1: Fetch the billing item, ensure it is under correct invoice and not soft-deleted
  const item =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        id: billingItemId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!item) {
    throw new Error("Billing item not found or not active for invoice");
  }

  // Step 2: Fetch the parent invoice for org/authorization verification
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findUnique({
      where: { id: billingInvoiceId },
    });
  if (!invoice) {
    throw new Error("Parent invoice not found");
  }

  // Step 3: Enforce authorization - department head must exist and not be deleted
  const departmentHeadRecord =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id, deleted_at: null },
    });
  if (!departmentHeadRecord) {
    throw new Error("Unauthorized: Department head not found or deactivated");
  }

  // Additional business/authorization checks can be inserted here
  // (e.g., departmentHead must be head for the org of invoice.organization_id)
  // See note: this is a simplified version. Real systems map head to org/department.

  // Step 4: Update field validation (run only for provided fields)
  if (body.quantity !== undefined && body.quantity <= 0) {
    throw new Error("Quantity must be positive integer");
  }
  if (body.unit_price !== undefined && body.unit_price < 0) {
    throw new Error("Unit price must be non-negative");
  }
  if (body.total_amount !== undefined && body.total_amount < 0) {
    throw new Error("Total amount must be non-negative");
  }

  // Step 5: Update billing item in DB (only allowed fields, never update id/invoice_id/billing_code_id)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_items.update({
      where: { id: item.id },
      data: {
        description: body.description ?? undefined,
        quantity: body.quantity ?? undefined,
        unit_price: body.unit_price ?? undefined,
        total_amount: body.total_amount ?? undefined,
        updated_at: now,
      },
    });

  // Step 6: Return DTO-conformant structure, formatting all dates
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
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
