import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a billing item for an invoice (IHealthcarePlatformBillingItem)
 *
 * Creates a new billing item under the specified billing invoice. This
 * operation maps to the healthcare_platform_billing_items table and allows
 * billing staff or administrators to itemize services or products delivered to
 * a patient encounter, including code assignment, quantity, and financial
 * metadata. It supports business logic for post-encounter billing entry,
 * real-time adjustments, and compliance documentation. All creation activities
 * are subject to full audit trails and business validation rules.
 *
 * Only authorized roles (billing staff, administrators, department heads) may
 * perform this operation. This action is typically part of broader invoice
 * creation, amendment, or post-encounter correction workflows.
 *
 * @param props - Request parameter object
 * @param props.departmentHead - The department head user (authorization
 *   context)
 * @param props.billingInvoiceId - The UUID of the billing invoice to add the
 *   item under
 * @param props.body - The IHealthcarePlatformBillingItem.ICreate DTO payload
 *   for the item
 * @returns The created IHealthcarePlatformBillingItem record, with all audit
 *   fields populated
 * @throws {Error} If the invoice does not exist, is deleted, or is not
 *   accessible
 * @throws {Error} If the billing code does not exist, is not active, or does
 *   not belong to the organization
 * @throws {Error} If a duplicate item (same billing_code_id on invoice_id)
 *   exists
 */
export async function posthealthcarePlatformDepartmentHeadBillingInvoicesBillingInvoiceIdBillingItems(props: {
  departmentHead: DepartmentheadPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingItem.ICreate;
}): Promise<IHealthcarePlatformBillingItem> {
  const { departmentHead, billingInvoiceId, body } = props;

  // 1. Validate the parent invoice exists and is not soft deleted
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Billing invoice not found or deleted");
  }

  // 2. Validate the billing code exists, is active
  const code =
    await MyGlobal.prisma.healthcare_platform_billing_codes.findFirst({
      where: {
        id: body.billing_code_id,
        active: true,
      },
    });
  if (!code) {
    throw new Error("Billing code not found or not active");
  }

  // 3. (OPTIONAL/TODO) Department head context check for authorization to this invoice's organization/department

  // 4. Ensure no duplicate item for (invoice_id, billing_code_id)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        invoice_id: billingInvoiceId,
        billing_code_id: body.billing_code_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      "A billing item with this code already exists for this invoice",
    );
  }

  // 5. Calculate values
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const itemId: string & tags.Format<"uuid"> = v4();
  const totalAmount: number = body.quantity * body.unit_price;

  // 6. Create item
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_items.create({
      data: {
        id: itemId,
        invoice_id: billingInvoiceId,
        billing_code_id: body.billing_code_id,
        description: body.description,
        quantity: body.quantity,
        unit_price: body.unit_price,
        total_amount: totalAmount,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 7. Map to API return type (dates cast to date-time string, id/uuid as strings)
  return {
    id: created.id,
    invoice_id: created.invoice_id,
    billing_code_id: created.billing_code_id,
    description: created.description,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_amount: created.total_amount,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
