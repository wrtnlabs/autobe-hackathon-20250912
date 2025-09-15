import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceApiIntegration";

/**
 * End-to-end test of advanced insurance API integration search for a system
 * admin.
 *
 * Steps:
 *
 * 1. Register a new system admin with unique business email, full name,
 *    password/provider.
 * 2. Log in as the newly registered system admin.
 * 3. Search insurance API integrations via PATCH, using a combination of
 *    filters: organization_id, status, supported_transaction_types. Include
 *    pagination and sorting in the request body.
 * 4. For each result, check that organization_id and status match filters and
 *    that the required transaction type is present in the
 *    supported_transaction_types string. Assert that sensitive secret
 *    fields are not present in the data (e.g., api_secret,
 *    connection_secret, access_key, password).
 * 5. If there are two or more pages, request the next page and ensure it does
 *    not overlap with page 1 records.
 * 6. Assert all data shapes are as expected (use typia.assert), and check
 *    multi-tenant isolation.
 */
export async function test_api_insurance_apiintegrations_advanced_search_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const joinReq = {
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: `${RandomGenerator.alphabets(8)}@company.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinReq,
  });
  typia.assert(admin);

  // 2. Log in as that admin
  const loginReq = {
    email: joinReq.email,
    provider: "local",
    provider_key: joinReq.provider_key,
    password: joinReq.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: loginReq,
  });
  typia.assert(login);

  // 3. Issue PATCH insurance API integration search with filters and pagination
  const basicFilter = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick(["active", "test", "failed"] as const),
    supported_transaction_types: RandomGenerator.pick([
      "eligibility",
      "claims",
      "realtime",
    ] as const),
    page: 1,
    page_size: 5,
    sort: "created_at DESC",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.IRequest;

  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.index(
      connection,
      { body: basicFilter },
    );
  typia.assert(page1);

  // 4. Verify all data matches each filter
  for (const row of page1.data) {
    TestValidator.equals(
      "organization_id matches filter",
      row.healthcare_platform_organization_id,
      basicFilter.organization_id,
    );
    TestValidator.equals(
      "status matches filter",
      row.status,
      basicFilter.status,
    );
    TestValidator.predicate(
      "supported transaction type is present",
      row.supported_transaction_types
        .split(",")
        .includes(basicFilter.supported_transaction_types),
    );
    TestValidator.predicate(
      "does not contain API secrets",
      !("api_secret" in row) &&
        !("connection_secret" in row) &&
        !("access_key" in row) &&
        !("password" in row),
    );
  }

  // 5. If more than 1 page, check page 2 for overlap
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.index(
        connection,
        { body: { ...basicFilter, page: 2 } },
      );
    typia.assert(page2);
    for (const row of page2.data) {
      const foundInPage1 = page1.data.find((x) => x.id === row.id);
      TestValidator.predicate(
        "no overlap between page1 and page2",
        !foundInPage1,
      );
    }
  }
}
