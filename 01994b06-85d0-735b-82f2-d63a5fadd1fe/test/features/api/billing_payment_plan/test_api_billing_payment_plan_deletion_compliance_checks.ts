import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test proper deletion of billing payment plans by organization admin including
 * error and compliance checks
 *
 * 1. Register org admin and obtain auth context
 * 2. Create a billing invoice
 * 3. Create a billing payment plan for the invoice
 * 4. Delete the plan and ensure deletion (no read operation available, so deletion
 *    must not throw, and further delete errors)
 * 5. Attempt to delete a finalized ("completed") plan and assert business rule
 *    error
 * 6. Attempt to delete a totally non-existent plan and assert not found error
 */
export async function test_api_billing_payment_plan_deletion_compliance_checks(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(adminAuth);
  const organizationId = typia.assert<string & tags.Format<"uuid">>(
    adminAuth.id,
  ); // using admin id or from created invoice

  // 2. Create invoice
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const invoiceBody = {
    organization_id: organizationId,
    patient_id: patientId,
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 1200,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 3. Create payment plan
  const planBody = {
    invoice_id: invoice.id,
    plan_type: "self-pay",
    terms_description: "Pay full amount by end date.",
    status: "active",
    total_amount: invoice.total_amount,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformBillingPaymentPlan.ICreate;
  const paymentPlan =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: planBody,
      },
    );
  typia.assert(paymentPlan);

  // 4. Delete newly created plan
  await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.erase(
    connection,
    {
      billingInvoiceId: invoice.id,
      billingPaymentPlanId: paymentPlan.id,
    },
  );

  // 5. Attempt deletion of finalized plan (use status "completed")
  // Make new plan in completed state
  const completedPlanBody = {
    invoice_id: invoice.id,
    plan_type: "self-pay",
    terms_description: "Paid in full via insurance.",
    status: "completed",
    total_amount: 0,
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
  } satisfies IHealthcarePlatformBillingPaymentPlan.ICreate;
  const completedPlan =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: completedPlanBody,
      },
    );
  typia.assert(completedPlan);
  await TestValidator.error("finalized plan cannot be deleted", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.erase(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentPlanId: completedPlan.id,
      },
    );
  });

  // 6. Try deleting a non-existent plan
  const randomPlanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent plan returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.erase(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentPlanId: randomPlanId,
        },
      );
    },
  );

  // 7. Attempt to delete already deleted plan (from step 4)
  await TestValidator.error(
    "already-deleted plan cannot be deleted twice",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.erase(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentPlanId: paymentPlan.id,
        },
      );
    },
  );
}
