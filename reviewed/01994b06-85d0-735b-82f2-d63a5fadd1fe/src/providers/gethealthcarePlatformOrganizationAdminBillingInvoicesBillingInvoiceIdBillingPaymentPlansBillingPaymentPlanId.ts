import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve details of a specific payment plan for a billing invoice by ID
 *
 * This operation fetches detailed information for a single billing payment plan
 * (by primary key), enforcing that the plan belongs to the specified invoice
 * and to the same organization as the authenticated admin. Access is limited to
 * organization admins and all accesses are audit-logged for compliance.
 *
 * @param props - Function arguments
 * @param props.organizationAdmin - Authenticated organization admin user
 * @param props.billingInvoiceId - Target billing invoice ID (UUID)
 * @param props.billingPaymentPlanId - Payment plan ID (UUID)
 * @returns Payment plan details (all fields, strict typing, datetime strings)
 * @throws {Error} If payment plan not found, invoice does not match
 *   organization, or access denied
 */
export async function gethealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentPlansBillingPaymentPlanId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingPaymentPlanId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingPaymentPlan> {
  const { organizationAdmin, billingInvoiceId, billingPaymentPlanId } = props;

  // 1. Fetch admin (ensure active)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!admin)
    throw new Error("Not authorized: admin record not found or deleted.");

  // 2. Lookup payment plan matching both IDs and not deleted, with invoice+org join
  const plan =
    await MyGlobal.prisma.healthcare_platform_billing_payment_plans.findFirst({
      where: {
        id: billingPaymentPlanId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
        invoice: {},
      },
      select: {
        id: true,
        invoice_id: true,
        plan_type: true,
        terms_description: true,
        status: true,
        total_amount: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        invoice: { select: { organization_id: true } },
      },
    });

  if (!plan)
    throw new Error(
      "Payment plan not found for specified invoice or already deleted.",
    );

  // 3. Ensure organization (from invoice) matches admin's org (secure tenancy)
  if (plan.invoice.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Access denied: invoice not in administrator's organization.",
    );
  }

  // 4. Audit log access (compliance trace)
  await MyGlobal.prisma.healthcare_platform_financial_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: plan.invoice.organization_id,
      entity_id: plan.id,
      user_id: organizationAdmin.id,
      entity_type: "billing_payment_plan",
      audit_action: "retrieve",
      action_description: `Viewed payment plan ${plan.id} for invoice ${plan.invoice_id}`,
      action_timestamp: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Map output fields strictly according to DTO (dates ISO, nullable as null)
  return {
    id: plan.id,
    invoice_id: plan.invoice_id,
    plan_type: plan.plan_type,
    terms_description: plan.terms_description,
    status: plan.status,
    total_amount: plan.total_amount,
    start_date: toISOStringSafe(plan.start_date),
    end_date: plan.end_date ? toISOStringSafe(plan.end_date) : null,
    created_at: toISOStringSafe(plan.created_at),
    updated_at: toISOStringSafe(plan.updated_at),
    deleted_at: plan.deleted_at ? toISOStringSafe(plan.deleted_at) : undefined,
  };
}
