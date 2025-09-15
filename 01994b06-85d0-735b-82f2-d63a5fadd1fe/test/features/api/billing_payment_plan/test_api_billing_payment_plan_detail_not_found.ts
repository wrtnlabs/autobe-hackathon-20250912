import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Verifies that when an organization administrator attempts to retrieve a
 * payment plan detail for a real billing invoice but supplies a non-existent
 * payment plan ID, the API returns a business 404 error.
 *
 * Steps:
 *
 * 1. Register and login as a test organization admin
 * 2. Create a test billing invoice for the admin's organization
 * 3. Attempt to GET the payment plan detail API with the invoice's id but a random
 *    (non-existent) paymentPlanId
 * 4. Assert that a business error occurs (not a type error), confirming proper
 *    not-found handling
 */
export async function test_api_billing_payment_plan_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const authed = await api.functional.auth.organizationAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(authed);

  // 3. Create billing invoice
  const invoiceBody = {
    organization_id: admin.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(10),
    status: "draft",
    total_amount: 10000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 4. Generate random (non-existent) payment plan ID
  const nonExistentPaymentPlanId = typia.random<string & tags.Format<"uuid">>();

  // 5. Try to GET non-existent payment plan for real invoice; expect business error (not type error)
  await TestValidator.error(
    "404 error when retrieving non-existent payment plan for invoice",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.at(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentPlanId: nonExistentPaymentPlanId,
        },
      );
    },
  );
}
