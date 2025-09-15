import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently deletes a specific billing payment record from a billing invoice
 * in the healthcare platform.
 *
 * This operation enables organization-level admin users to hard-delete a
 * payment entry, provided it does not violate reconciliation, audit, or
 * compliance constraints. Payment must belong to the invoice and be in an
 * editable state, and invoice must not be finalized, audited, or locked.
 * Deletion is hard and cannot be undone. Typical use cases include undoing
 * accidental or test payments not yet posted. Strict business and regulatory
 * checks apply.
 *
 * @param props - Object containing organization admin payload, target invoice
 *   ID, and target payment ID.
 * @param props.organizationAdmin - Authenticated organization admin payload.
 * @param props.billingInvoiceId - UUID of the parent invoice.
 * @param props.billingPaymentId - UUID of the payment record to delete.
 * @returns Void
 * @throws {Error} If payment or invoice is not found, payment does not belong
 *   to invoice, or business rules prohibit deletion per status.
 */
export async function deletehealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentsBillingPaymentId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingPaymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, billingInvoiceId, billingPaymentId } = props;

  // Fetch payment record
  const payment =
    await MyGlobal.prisma.healthcare_platform_billing_payments.findUnique({
      where: { id: billingPaymentId },
      select: { id: true, invoice_id: true, status: true },
    });

  if (!payment) throw new Error("Billing payment record not found.");
  if (payment.invoice_id !== billingInvoiceId)
    throw new Error("Billing payment does not belong to specified invoice.");

  // Fetch invoice to check its status
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findUnique({
      where: { id: billingInvoiceId },
      select: { id: true, status: true },
    });
  if (!invoice) throw new Error("Billing invoice record not found.");

  const forbiddenStatuses = ["posted", "reconciled", "audited", "finalized"];

  if (forbiddenStatuses.includes(payment.status))
    throw new Error(
      `Cannot delete payment: payment status is '${payment.status}' and is restricted for deletion.`,
    );
  if (forbiddenStatuses.includes(invoice.status))
    throw new Error(
      `Cannot delete payment: invoice is in status '${invoice.status}' and payments cannot be deleted.`,
    );

  // Hard delete: payment is fully removed from database (no soft deletion)
  await MyGlobal.prisma.healthcare_platform_billing_payments.delete({
    where: { id: billingPaymentId },
  });

  // NOTE: If audit log model required in future, logic to insert audit record may be added here.
}
