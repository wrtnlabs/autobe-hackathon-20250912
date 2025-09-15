import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates creation of a billing payment plan for a healthcare invoice by
 * an organization admin.
 *
 * 1. Register and authenticate a new org admin (using join endpoint). Extract
 *    admin info and tokens.
 * 2. Create a new billing invoice as this org admin (supply all required
 *    invoice fields, using admin's organization_id and plausible test
 *    data).
 * 3. Submit a valid billing payment plan for the invoice, referencing
 *    invoice_id. Set all required fields, mimicking a real installment
 *    arrangement.
 * 4. Assert API returns a payment plan that matches the input and is correctly
 *    linked to the bill/invoice.
 * 5. Attempt to create a duplicate active payment plan for the same invoice
 *    and ensure system rejects this with an error (no duplicate active
 *    plans allowed).
 */
export async function test_api_billing_payment_plan_creation_success_admin_context(
  connection: api.IConnection,
) {
  // Step 1: Register & authenticate org admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "PW!1#Test$",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Step 2: Create new billing invoice for this org
  const invoiceCreate = {
    organization_id: admin.id, // mock org_id for test
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    encounter_id: null,
    invoice_number: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph(),
    status: "draft",
    total_amount: 17580,
    currency: "USD",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceCreate },
    );
  typia.assert(invoice);
  TestValidator.equals(
    "invoice data matches organization",
    invoice.organization_id,
    admin.id,
  );

  // Step 3: Create billing payment plan (valid)
  const planCreate = {
    invoice_id: invoice.id,
    plan_type: "self-pay",
    terms_description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    total_amount: invoice.total_amount,
    start_date: new Date().toISOString(),
    end_date: null,
  } satisfies IHealthcarePlatformBillingPaymentPlan.ICreate;
  const plan =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
      connection,
      { billingInvoiceId: invoice.id, body: planCreate },
    );
  typia.assert(plan);
  TestValidator.equals("plan.invoice_id matches", plan.invoice_id, invoice.id);
  TestValidator.equals(
    "plan plan_type matches",
    plan.plan_type,
    planCreate.plan_type,
  );
  TestValidator.equals("plan.status matches", plan.status, planCreate.status);
  TestValidator.equals(
    "plan total_amount matches invoice",
    plan.total_amount,
    invoice.total_amount,
  );
  // Step 4: Attempt duplicate plan creation for same invoice (should fail - only one active plan allowed)
  await TestValidator.error(
    "duplicate payment plan creation on same invoice fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
        connection,
        { billingInvoiceId: invoice.id, body: planCreate },
      );
    },
  );
}
