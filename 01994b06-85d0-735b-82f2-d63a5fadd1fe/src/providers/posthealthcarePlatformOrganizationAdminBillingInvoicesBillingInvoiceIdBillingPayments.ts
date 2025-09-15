import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new billing payment for a billing invoice.
 *
 * This operation creates a new billing payment record associated with the
 * specified billing invoice in the healthcare_platform_billing_payments table.
 * It is intended for finance staff or organization admins to properly record
 * payment transactions against an invoice. The function will validate business
 * rules including invoice existence, prevention of over-payment, and ensures
 * all audit/compliance fields are populated.
 *
 * An organization admin must be authenticated and is responsible for the
 * integrity of the transaction. The newly created payment record is persisted
 * with all relevant fields, using the correct data structures and business
 * logic, and the return value is formatted as specified in
 * IHealthcarePlatformBillingPayment.
 *
 * @param props - Object with organization admin, invoice UUID, and payment
 *   creation input body.
 * @param props.organizationAdmin - Authenticated payload for the responsible
 *   organization admin.
 * @param props.billingInvoiceId - UUID of the billing invoice to which payment
 *   applies.
 * @param props.body - Payment creation input, including payee, method, amount,
 *   currency, and payment date/status.
 * @returns The created billing payment record as per
 *   IHealthcarePlatformBillingPayment.
 * @throws {Error} If the invoice is not found or deleted, or payment would
 *   exceed invoice total.
 */
export async function posthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPayments(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPayment.ICreate;
}): Promise<IHealthcarePlatformBillingPayment> {
  const { organizationAdmin, billingInvoiceId, body } = props;

  // 1. Verify that the invoice exists and is not soft-deleted
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Invoice not found or has been deleted");
  }

  // 2. Calculate sum of previous (non-deleted) payments for this invoice
  const previousPayments =
    await MyGlobal.prisma.healthcare_platform_billing_payments.findMany({
      where: {
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
      select: {
        amount: true,
      },
    });
  const totalPaid = previousPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  if (totalPaid + body.amount > invoice.total_amount) {
    throw new Error("Payment would exceed invoice total");
  }

  // 3. Insert the payment record (UUID and timestamps, with correct types)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_payments.create({
      data: {
        id: v4(),
        invoice_id: billingInvoiceId,
        payee_id: body.payee_id ?? null,
        payment_method_id: body.payment_method_id ?? null,
        amount: body.amount,
        currency: body.currency,
        reference_number: body.reference_number ?? null,
        payment_date: body.payment_date,
        memo: body.memo ?? null,
        status: body.status ?? "posted",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 4. Return the payment object, mapping nulls/optionals for the DTO
  return {
    id: created.id,
    invoice_id: created.invoice_id,
    payee_id: created.payee_id === null ? undefined : created.payee_id,
    payment_method_id:
      created.payment_method_id === null
        ? undefined
        : created.payment_method_id,
    amount: created.amount,
    currency: created.currency,
    reference_number:
      created.reference_number === null ? undefined : created.reference_number,
    payment_date: created.payment_date,
    memo: created.memo === null ? undefined : created.memo,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at === null ? undefined : created.deleted_at,
  };
}
