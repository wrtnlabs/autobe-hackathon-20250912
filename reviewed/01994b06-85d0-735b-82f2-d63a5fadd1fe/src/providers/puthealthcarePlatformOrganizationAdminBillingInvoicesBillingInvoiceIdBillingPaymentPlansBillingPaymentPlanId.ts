import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing payment plan associated with a billing invoice
 *
 * This operation updates a payment plan for a specific billing invoice,
 * allowing authorized organization admins to revise the plan terms, schedule,
 * status, or description, as permitted by business rules and compliance
 * requirements. Updates are validated to prevent modifications for
 * finalized/cancelled/expired/defaulted plans, explicitly forbid status
 * reactivation (e.g., cancelled -> active), and all changes are audit-logged.
 *
 * @param props - The properties for updating a payment plan
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation
 * @param props.billingInvoiceId - The UUID of the billing invoice
 * @param props.billingPaymentPlanId - The UUID of the payment plan to update
 * @param props.body - Fields to update on the payment plan (optional fields)
 * @returns The updated IHealthcarePlatformBillingPaymentPlan object with all
 *   fields populated
 * @throws {Error} When the plan is not found, invoice not found, organization
 *   id does not match, update forbidden by status, or forbidden status
 *   transition attempted
 */
export async function puthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentPlansBillingPaymentPlanId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingPaymentPlanId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPaymentPlan.IUpdate;
}): Promise<IHealthcarePlatformBillingPaymentPlan> {
  const { organizationAdmin, billingInvoiceId, billingPaymentPlanId, body } =
    props;

  // 1. Validate update body is not empty
  if (!body || Object.keys(body).length === 0) {
    throw new Error("No update fields provided");
  }

  // 2. Find the payment plan (by id, invoice_id, not soft-deleted)
  const plan =
    await MyGlobal.prisma.healthcare_platform_billing_payment_plans.findFirst({
      where: {
        id: billingPaymentPlanId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!plan) {
    throw new Error("Payment plan not found");
  }

  // 3. Find the related invoice (must also not be soft-deleted)
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Organization does not match this admin");
  }

  // 4. Disallow updates if plan is in finalized/cancelled/defaulted/expired state
  const finalStatuses = ["completed", "defaulted", "cancelled", "expired"];
  if (finalStatuses.includes(plan.status)) {
    throw new Error(
      "Cannot update a finalized/cancelled/expired/defaulted payment plan",
    );
  }

  // 5. Forbid illegal status transition (e.g., cancelled->active)
  if (
    typeof body.status === "string" &&
    plan.status === "cancelled" &&
    body.status === "active"
  ) {
    throw new Error(
      "Forbidden status transition: cannot reactivate a cancelled plan",
    );
  }

  // 6. Update mutable fields only if provided, always update updated_at
  const update: Record<string, unknown> = {
    ...(body.plan_type !== undefined && { plan_type: body.plan_type }),
    ...(body.terms_description !== undefined && {
      terms_description: body.terms_description,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.total_amount !== undefined && { total_amount: body.total_amount }),
    ...(body.start_date !== undefined && { start_date: body.start_date }),
    ...(body.end_date !== undefined && { end_date: body.end_date }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_payment_plans.update({
      where: { id: billingPaymentPlanId },
      data: update,
    });

  // 7. Audit log entry for this payment plan update
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_financial_audit_logs.create({
    data: {
      id: v4(),
      organization_id: invoice.organization_id,
      entity_id: billingPaymentPlanId,
      user_id: organizationAdmin.id,
      entity_type: "billing_payment_plan",
      audit_action: "update",
      action_description:
        "Updated payment plan (fields: " +
        Object.keys(update)
          .filter((k) => k !== "updated_at")
          .join(", ") +
        ")", // fields touched for audit
      action_timestamp: now,
      created_at: now,
    },
  });

  return {
    id: updated.id,
    invoice_id: updated.invoice_id,
    plan_type: updated.plan_type,
    terms_description: updated.terms_description,
    status: updated.status,
    total_amount: updated.total_amount,
    start_date: toISOStringSafe(updated.start_date),
    end_date: updated.end_date ? toISOStringSafe(updated.end_date) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
