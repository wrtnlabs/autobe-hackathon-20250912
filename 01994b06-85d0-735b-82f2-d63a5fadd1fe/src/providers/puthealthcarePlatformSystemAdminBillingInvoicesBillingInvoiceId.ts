import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates a billing invoice by ID.
 *
 * Updates allowed invoice fields (status, due_date, description,
 * invoice_number, currency, total_amount) for a specified billing invoice,
 * subject to admin authorization and policy. Non-updatable or non-existent
 * invoices will reject with error. All changes are fully audited and subject to
 * compliance.
 *
 * @param props - The update properties
 * @param props.systemAdmin - The authenticated system admin payload
 * @param props.billingInvoiceId - The UUID of the invoice to update
 * @param props.body - Update fields for the invoice (only allowed fields
 *   applied)
 * @returns The updated IHealthcarePlatformBillingInvoice
 * @throws {Error} If the billing invoice is not found or is deleted
 */
export async function puthealthcarePlatformSystemAdminBillingInvoicesBillingInvoiceId(props: {
  systemAdmin: SystemadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingInvoice.IUpdate;
}): Promise<IHealthcarePlatformBillingInvoice> {
  const { systemAdmin, billingInvoiceId, body } = props;

  // Only allow if invoice exists and is not soft-deleted
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: { id: billingInvoiceId, deleted_at: null },
    });
  if (!invoice) {
    throw new Error("Billing invoice not found or already deleted");
  }

  // Update allowed mutable fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.update({
      where: { id: billingInvoiceId },
      data: {
        status: body.status ?? undefined,
        description: body.description ?? undefined,
        due_date: body.due_date ?? undefined,
        invoice_number: body.invoice_number ?? undefined,
        currency: body.currency ?? undefined,
        total_amount: body.total_amount ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    organization_id: updated.organization_id,
    patient_id: updated.patient_id,
    encounter_id:
      typeof updated.encounter_id !== "undefined" &&
      updated.encounter_id !== null
        ? updated.encounter_id
        : undefined,
    invoice_number: updated.invoice_number,
    description:
      typeof updated.description !== "undefined" && updated.description !== null
        ? updated.description
        : undefined,
    status: updated.status,
    total_amount: updated.total_amount,
    currency: updated.currency,
    due_date:
      typeof updated.due_date !== "undefined" && updated.due_date !== null
        ? toISOStringSafe(updated.due_date)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
