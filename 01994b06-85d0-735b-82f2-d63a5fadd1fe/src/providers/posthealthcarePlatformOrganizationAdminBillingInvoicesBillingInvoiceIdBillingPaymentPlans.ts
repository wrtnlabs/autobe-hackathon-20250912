import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new payment plan tied to a specific billing invoice.
 *
 * This endpoint allows an organization admin to create a payment plan
 * associated with a specified billing invoice. It ensures no duplicate active
 * payment plan exists for the same invoice and audits the creation for
 * compliance.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the creation
 * @param props.billingInvoiceId - UUID of the billing invoice to associate the
 *   plan with
 * @param props.body - The payment plan creation data including type, schedule,
 *   amount, and terms
 * @returns The newly created payment plan as DTO
 * @throws {Error} When the billing invoice does not exist or is deleted
 * @throws {Error} When the organization admin does not have permission for the
 *   invoice
 * @throws {Error} When a duplicate active payment plan exists for the invoice
 */
export async function posthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentPlans(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPaymentPlan.ICreate;
}): Promise<IHealthcarePlatformBillingPaymentPlan> {
  // Step 1: Load the billing invoice, must not be deleted and must belong to this admin's org
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: props.billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) throw new Error("Billing invoice not found or is deleted");

  // Step 2: Ensure organization admin is in the right organization
  if (invoice.organization_id !== props.organizationAdmin.id) {
    throw new Error(
      "Organization admin is not permitted to manage this invoice",
    );
  }

  // Step 3: Check for duplicate active payment plan on the invoice
  const conflict =
    await MyGlobal.prisma.healthcare_platform_billing_payment_plans.findFirst({
      where: {
        invoice_id: props.billingInvoiceId,
        status: "active",
        deleted_at: null,
      },
    });
  if (conflict) {
    throw new Error("An active payment plan already exists for this invoice");
  }

  // Step 4: Create the payment plan
  const now = toISOStringSafe(new Date());
  const paymentPlan =
    await MyGlobal.prisma.healthcare_platform_billing_payment_plans.create({
      data: {
        id: v4(),
        invoice_id: props.billingInvoiceId,
        plan_type: props.body.plan_type,
        terms_description: props.body.terms_description,
        status: props.body.status,
        total_amount: props.body.total_amount,
        start_date: props.body.start_date,
        end_date:
          props.body.end_date !== undefined ? props.body.end_date : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 5: Audit log the creation in the financial_audit_logs table
  await MyGlobal.prisma.healthcare_platform_financial_audit_logs.create({
    data: {
      id: v4(),
      organization_id: invoice.organization_id,
      entity_id: paymentPlan.id,
      user_id: props.organizationAdmin.id,
      entity_type: "payment_plan",
      audit_action: "create",
      action_description: `Created payment plan for invoice ${invoice.id}, terms: ${props.body.terms_description}`,
      action_timestamp: now,
      created_at: now,
    },
  });

  // Step 6: Return DTO structure
  return {
    id: paymentPlan.id,
    invoice_id: paymentPlan.invoice_id,
    plan_type: paymentPlan.plan_type,
    terms_description: paymentPlan.terms_description,
    status: paymentPlan.status,
    total_amount: paymentPlan.total_amount,
    start_date: paymentPlan.start_date,
    end_date: paymentPlan.end_date,
    created_at: paymentPlan.created_at,
    updated_at: paymentPlan.updated_at,
    deleted_at: paymentPlan.deleted_at,
  };
}
