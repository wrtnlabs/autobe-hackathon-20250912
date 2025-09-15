import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingAdjustment";

/**
 * E2E test for search and auth access control of billing adjustments by an
 * organization admin.
 *
 * Validates:
 *
 * 1. Org admin onboarding and authentication (join, login)
 * 2. Successful search for adjustments from a billing invoice (organization
 *    scope)
 * 3. Enforcement of data isolation: other organizations/invoices can't be
 *    fetched
 * 4. Access control: forbidden on unauthenticated/invalid org context
 * 5. Pagination, filtering, edge/filter error cases
 */
export async function test_api_billing_adjustments_org_admin_search_and_auth_scope(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding (join & login)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(adminAuth);

  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginInput },
  );
  typia.assert(loginResult);
  TestValidator.equals("login id match", loginResult.id, adminAuth.id);

  // 2. Simulate a billingInvoiceId (no invoice POST available)
  const billingInvoiceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Simulate adjustments already exist for the invoice (assume the PATCH endpoint will return random data)

  // 4. List adjustments with minimal and then detailed filter/pagination
  const requestBody = {
    invoice_id: billingInvoiceId,
    page: 1,
    pageSize: 5,
  } satisfies IHealthcarePlatformBillingAdjustment.IRequest;
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.index(
      connection,
      { billingInvoiceId, body: requestBody },
    );
  typia.assert(result);
  TestValidator.equals(
    "response pagination invoice_id match",
    result.data.every((adj) => adj.invoice_id === billingInvoiceId),
    true,
  );

  // 5. Edge: use a secondary random invoice id (simulate from another org) (should see empty or error per isolation policy)
  const badInvoiceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (badInvoiceId !== billingInvoiceId) {
    // Should return empty or forbidden (never type error test).
    const badRequestBody = {
      invoice_id: badInvoiceId,
      page: 1,
      pageSize: 1,
    } satisfies IHealthcarePlatformBillingAdjustment.IRequest;
    await TestValidator.error(
      "forbidden for wrong invoice/organization",
      async () => {
        await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.index(
          connection,
          { billingInvoiceId: badInvoiceId, body: badRequestBody },
        );
      },
    );
  }

  // 6. Unauthenticated access (simulate no valid headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search is forbidden", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.index(
      unauthConn,
      { billingInvoiceId, body: requestBody },
    );
  });

  // 7. Pagination/Filter edge: query page way beyond data (should return empty page)
  const pageRequest = {
    invoice_id: billingInvoiceId,
    page: 1000,
    pageSize: 10,
  } satisfies IHealthcarePlatformBillingAdjustment.IRequest;
  const pageResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.index(
      connection,
      { billingInvoiceId, body: pageRequest },
    );
  typia.assert(pageResult);
  TestValidator.equals("empty data for far page", pageResult.data.length, 0);

  // 8. Filtering with unrealistic adjustment_type (expect empty)
  const filterRequest = {
    invoice_id: billingInvoiceId,
    adjustment_type: "NO_SUCH_TYPE_TEST_" + RandomGenerator.alphaNumeric(6),
  } satisfies IHealthcarePlatformBillingAdjustment.IRequest;
  const filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.index(
      connection,
      { billingInvoiceId, body: filterRequest },
    );
  typia.assert(filterResult);
  TestValidator.equals(
    "expect empty filtered data for bogus adjustment_type",
    filterResult.data.length,
    0,
  );
}
