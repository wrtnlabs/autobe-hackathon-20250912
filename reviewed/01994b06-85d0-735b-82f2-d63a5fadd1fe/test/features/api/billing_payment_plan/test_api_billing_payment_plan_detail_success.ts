import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end scenario for retrieving a specific payment plan by its ID for
 * a billing invoice as an organization admin.
 *
 * 1. Register a new organization admin account (join).
 * 2. Log in as organization admin to set auth context.
 * 3. Create a new billing invoice (must create an organization, patient, and
 *    provide invoice data).
 * 4. Create a billing payment plan for the created invoice.
 * 5. Fetch the payment plan details with GET using both invoiceId and
 *    paymentPlanId.
 * 6. Assert that the returned data exactly matches the originally created
 *    payment plan data (all native fields).
 */
export async function test_api_billing_payment_plan_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Organization admin joins (register)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: "securePassword123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 2: Login as organization admin
  const loginBody = {
    email: adminEmail,
    password: "securePassword123",
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedIn);

  // Step 3: Create a billing invoice
  const invoiceBody = {
    organization_id: admin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 10000,
    currency: "USD",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // Step 4: Create a billing payment plan for this invoice
  const startDate = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  const endDate = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .substring(0, 10); // 7 days later
  const paymentPlanBody = {
    invoice_id: invoice.id,
    plan_type: "self-pay",
    terms_description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    total_amount: 10000,
    start_date: startDate,
    end_date: endDate,
  } satisfies IHealthcarePlatformBillingPaymentPlan.ICreate;
  const paymentPlan =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: paymentPlanBody,
      },
    );
  typia.assert(paymentPlan);

  // Step 5: Fetch the payment plan by ID
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.at(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentPlanId: paymentPlan.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(fetched);

  // Step 6: Validate that fetched plan matches created plan (all core fields)
  TestValidator.equals(
    "payment plan details should match created plan",
    fetched.invoice_id,
    paymentPlan.invoice_id,
  );
  TestValidator.equals(
    "plan_type should match",
    fetched.plan_type,
    paymentPlan.plan_type,
  );
  TestValidator.equals(
    "terms_description should match",
    fetched.terms_description,
    paymentPlan.terms_description,
  );
  TestValidator.equals(
    "status should match",
    fetched.status,
    paymentPlan.status,
  );
  TestValidator.equals(
    "total_amount should match",
    fetched.total_amount,
    paymentPlan.total_amount,
  );
  TestValidator.equals(
    "start_date should match",
    fetched.start_date,
    paymentPlan.start_date,
  );
  TestValidator.equals(
    "end_date should match",
    fetched.end_date,
    paymentPlan.end_date,
  );
}
