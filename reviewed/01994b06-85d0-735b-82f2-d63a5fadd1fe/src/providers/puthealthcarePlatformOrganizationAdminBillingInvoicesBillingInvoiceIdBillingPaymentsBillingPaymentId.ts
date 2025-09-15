import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing payment record for a billing invoice
 * (healthcare_platform_billing_payments table) in the healthcare platform.
 *
 * Allows authorized organization administrators to update fields such as
 * amount, status, payment_method_id, memo, and payment_date for a specific
 * payment entry, provided the record is not already finalized, voided,
 * refunded, or deleted. Enforces role-based access control and performs
 * validation on payment, invoice, and (if applicable) payment method existence
 * and organization alignment. All date fields are returned as ISO 8601
 * date-time strings.
 *
 * @param props - Request object containing:
 *
 *   - OrganizationAdmin: Authenticated organization admin user info
 *   - BillingInvoiceId: UUID of the billing invoice
 *   - BillingPaymentId: UUID of the billing payment to update
 *   - Body: Data fields to update as per IHealthcarePlatformBillingPayment.IUpdate
 *
 * @returns The updated payment record, mapped to
 *   IHealthcarePlatformBillingPayment
 * @throws {Error} If the payment, invoice, admin, or payment method is invalid
 *   or not found, or if update is not permitted.
 */
export async function puthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentsBillingPaymentId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingPaymentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPayment.IUpdate;
}): Promise<IHealthcarePlatformBillingPayment> {
  const { organizationAdmin, billingInvoiceId, billingPaymentId, body } = props;

  // 1. Fetch payment record (must exist, belong to invoice, not soft-deleted)
  const payment =
    await MyGlobal.prisma.healthcare_platform_billing_payments.findFirst({
      where: {
        id: billingPaymentId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!payment) {
    throw new Error("Payment not found or already deleted.");
  }

  // 2. Fetch parent invoice (for org validation)
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
      },
    });
  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  // 3. Verify organizationAdmin is an active admin
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin) {
    throw new Error("Organization admin not found or revoked.");
  }

  // 4. If updating payment_method_id, validate it exists, is active, and is for this org
  if (body.payment_method_id !== undefined) {
    const method =
      await MyGlobal.prisma.healthcare_platform_billing_payment_methods.findFirst(
        {
          where: {
            id: body.payment_method_id,
            organization_id: invoice.organization_id,
            is_active: true,
          },
        },
      );
    if (!method) {
      throw new Error(
        "Invalid or inactive payment method for this organization.",
      );
    }
  }

  // 5. Prevent updating finalized/locked payment records
  if (payment.status === "voided" || payment.status === "refunded") {
    throw new Error("Cannot modify payment with finalized/locked status.");
  }

  // 6. Carry out update — dates handled via toISOStringSafe
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_payments.update({
      where: { id: billingPaymentId },
      data: {
        ...(body.amount !== undefined ? { amount: body.amount } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.payment_method_id !== undefined
          ? { payment_method_id: body.payment_method_id }
          : {}),
        ...(body.memo !== undefined ? { memo: body.memo } : {}),
        ...(body.payment_date !== undefined
          ? { payment_date: toISOStringSafe(body.payment_date) }
          : {}),
        // updated_at is handled by Prisma @updatedAt (see schema)
      },
    });

  // 7. Return API DTO: all dates mapped via toISOStringSafe
  return {
    id: updated.id,
    invoice_id: updated.invoice_id,
    payee_id: updated.payee_id ?? undefined,
    payment_method_id: updated.payment_method_id ?? undefined,
    amount: updated.amount,
    currency: updated.currency,
    reference_number: updated.reference_number ?? undefined,
    payment_date: toISOStringSafe(updated.payment_date),
    memo: updated.memo ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
