import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a billing payment by ID for a billing invoice
 * (healthcare_platform_billing_payments)
 *
 * Fetches detailed information for a single billing payment record under a
 * particular invoice. This endpoint is used by finance staff and organization
 * administrators to view transaction details, audit status, payer/payee data,
 * method used, status, and all metadata required for audit and compliance
 * reviews.
 *
 * The response includes transaction record, payee, payment method, any
 * reconciliation data, posting and update timestamps, and any related reference
 * numbers or memos. The endpoint validates the linkage between the invoice and
 * payment record before returning details.
 *
 * Access is limited to organization-admin roles to maintain financial security
 * and protect PHI. Response is optimized for audit, compliance, and reporting,
 * with all accesses logged appropriately for traceability.
 *
 * @param props - Request properties with organizationAdmin authentication and
 *   invoice/payment uuids
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.billingInvoiceId - Unique identifier of the billing invoice
 * @param props.billingPaymentId - Unique identifier of the billing payment to
 *   retrieve
 * @returns IHealthcarePlatformBillingPayment - Full payment record data
 * @throws {Error} When the billing payment does not exist or is not linked to
 *   the invoice
 */
export async function gethealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentsBillingPaymentId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingPaymentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingPayment> {
  const { billingInvoiceId, billingPaymentId } = props;
  const payment =
    await MyGlobal.prisma.healthcare_platform_billing_payments.findFirst({
      where: {
        id: billingPaymentId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!payment) throw new Error("Billing payment not found or not authorized");
  return {
    id: payment.id,
    invoice_id: payment.invoice_id,
    payee_id: payment.payee_id === null ? undefined : payment.payee_id,
    payment_method_id:
      payment.payment_method_id === null
        ? undefined
        : payment.payment_method_id,
    amount: payment.amount,
    currency: payment.currency,
    reference_number:
      payment.reference_number === null ? undefined : payment.reference_number,
    payment_date: toISOStringSafe(payment.payment_date),
    memo: payment.memo === null ? undefined : payment.memo,
    status: payment.status,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at:
      payment.deleted_at === null
        ? undefined
        : toISOStringSafe(payment.deleted_at),
  };
}
