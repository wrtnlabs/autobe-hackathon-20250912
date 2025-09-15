import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPaymentPlan";

/**
 * Test empty billing payment plan list for a billingInvoiceId
 *
 * 1. Create a new organization admin by join (random email, name, password, phone)
 * 2. Login as the same admin (using created credentials)
 * 3. Create a new billing invoice (random required data)
 * 4. Fetch the billing payment plans page (index, PATCH) for this invoice
 * 5. Assert that data array is empty and pagination reflects zero results
 */
export async function test_api_billing_payment_plan_list_empty(
  connection: api.IConnection,
) {
  // 1. Create admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as admin
  const loginBody = {
    email,
    password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const login = await api.functional.auth.organizationAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(login);

  // 3. Create billing invoice
  const invoiceBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 1000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceBody },
    );
  typia.assert(invoice);

  // 4. Fetch billing payment plan list (should be empty)
  const reqBody = {} satisfies IHealthcarePlatformBillingPaymentPlan.IRequest;
  const response =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPaymentPlans.index(
      connection,
      { billingInvoiceId: invoice.id, body: reqBody },
    );
  typia.assert(response);
  TestValidator.equals(
    "billing payment plan data array must be empty",
    response.data,
    [],
  );
  TestValidator.equals(
    "billing payment plan page record count must be zero",
    response.pagination.records,
    0,
  );
}
