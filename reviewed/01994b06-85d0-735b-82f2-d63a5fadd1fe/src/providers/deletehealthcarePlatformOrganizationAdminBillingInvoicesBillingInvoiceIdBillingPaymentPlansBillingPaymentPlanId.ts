import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a billing payment plan from a billing invoice.
 *
 * This operation deletes a specific billing payment plan
 * (healthcare_platform_billing_payment_plans) associated with the given billing
 * invoice. It ensures the payment plan is deleted only if allowed under
 * business and compliance rules (e.g., no active/finalized payments present).
 * The operation logs an audit/compliance entry, and deletion is hard unless
 * organizational retention policies dictate otherwise.
 *
 * Only admins with the organizationAdmin role are permitted to perform this
 * operation. All actions are compliant with financial audit requirements.
 *
 * @param props - Operation parameters
 * @param props.organizationAdmin - OrganizationadminPayload of the admin
 *   performing the deletion
 * @param props.billingInvoiceId - Unique identifier of the billing invoice to
 *   which the payment plan belongs
 * @param props.billingPaymentPlanId - Unique identifier of the billing payment
 *   plan to be deleted
 * @returns Void
 * @throws {Error} When payment plan is not found, does not belong to the
 *   invoice, is in non-deletable status, or when the parent invoice is not
 *   found for audit log context
 */
export async function deletehealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentPlansBillingPaymentPlanId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingPaymentPlanId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, billingInvoiceId, billingPaymentPlanId } = props;

  // Step 1: Fetch the payment plan and verify it exists and is not deleted
  const paymentPlan =
    await MyGlobal.prisma.healthcare_platform_billing_payment_plans.findFirst({
      where: {
        id: billingPaymentPlanId,
        deleted_at: null,
      },
    });
  if (!paymentPlan) {
    throw new Error("Payment plan not found");
  }

  // Step 2: Ensure the payment plan belongs to the specified billing invoice
  if (paymentPlan.invoice_id !== billingInvoiceId) {
    throw new Error("Payment plan does not belong to this invoice");
  }

  // Step 3: Reject deletion if payment plan is in an active or finalized status
  if (paymentPlan.status === "active" || paymentPlan.status === "completed") {
    throw new Error("Cannot delete payment plan in this status");
  }

  // Step 4: Proceed to hard delete the payment plan (compliance allows hard delete)
  await MyGlobal.prisma.healthcare_platform_billing_payment_plans.delete({
    where: { id: billingPaymentPlanId },
  });

  // Step 5: Fetch the invoice to obtain organization_id for audit logging
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: { id: billingInvoiceId },
    });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Step 6: Write an audit log for compliance & traceability
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_financial_audit_logs.create({
    data: {
      id: v4(),
      organization_id: invoice.organization_id,
      entity_id: billingPaymentPlanId,
      user_id: organizationAdmin.id,
      entity_type: "billing_payment_plan",
      audit_action: "delete",
      action_description: "Billing payment plan deleted by organization admin",
      action_timestamp: now,
      created_at: now,
    },
  });
  // No return value by contract
}
