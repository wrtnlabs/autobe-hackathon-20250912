import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceApiIntegration";

/**
 * E2E: Insurance API Integration pagination and org scope (org admin)
 *
 * Validates organization-scoped paginated search for insurance API
 * integrations, ensuring org admin only sees their own integrations, never
 * sees other orgs', and that pagination, filtering, and sorting all
 * function as intended.
 *
 * Steps:
 *
 * 1. Register a new org admin (POST /auth/organizationAdmin/join)
 * 2. Login as that org admin to start session (POST
 *    /auth/organizationAdmin/login)
 * 3. Query integrations via PATCH
 *    /healthcarePlatform/organizationAdmin/insuranceApiIntegrations with
 *    org_id filter, pagination, and sort
 * 4. Verify results ONLY contain integrations for admin's org
 * 5. Use filter for random (other) org_id: results should be empty (scope
 *    enforced)
 * 6. Confirm no sensitive fields (PHI/API keys/etc) are present
 * 7. Check pagination response (page info, etc)
 * 8. Check alternate sort order works
 * 9. Assert typia on all responses
 */
export async function test_api_orgadmin_insurance_apiintegrations_pagination_and_scope(
  connection: api.IConnection,
) {
  // 1. Register new org admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Login as org admin
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const session = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginInput },
  );
  typia.assert(session);

  // Assume admin.id is organization_id for scoping (API/DTO exposes only admin, not separate org entity)
  const orgId = admin.id;

  // 3. Query integrations for admin's org (first page, descending by created_at)
  const page1 =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.index(
      connection,
      {
        body: {
          organization_id: orgId,
          page: 1,
          page_size: 3,
          sort: "created_at DESC",
        } satisfies IHealthcarePlatformInsuranceApiIntegration.IRequest,
      },
    );
  typia.assert(page1);
  for (const row of page1.data) {
    TestValidator.equals(
      "Only admin's org integrations",
      row.healthcare_platform_organization_id,
      orgId,
    );
    TestValidator.predicate(
      "No unauthorized fields",
      Object.keys(row).every((k) =>
        [
          "id",
          "healthcare_platform_organization_id",
          "insurance_vendor_code",
          "connection_uri",
          "supported_transaction_types",
          "status",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(k),
      ),
    );
  }

  // 5. Attempt to query for a different org's integrations (should return 0)
  const otherOrgPage =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.index(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          page_size: 3,
        } satisfies IHealthcarePlatformInsuranceApiIntegration.IRequest,
      },
    );
  typia.assert(otherOrgPage);
  TestValidator.equals(
    "No data for unrelated org",
    otherOrgPage.data.length,
    0,
  );

  // 7. Pagination assertions
  TestValidator.equals("Page is 1", page1.pagination.current, 1);
  TestValidator.equals("Page size is 3", page1.pagination.limit, 3);
  TestValidator.predicate("Total pages is >= 1", page1.pagination.pages >= 1);

  // 8. Sort ascending by created_at
  const ascPage =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.index(
      connection,
      {
        body: {
          organization_id: orgId,
          page: 1,
          page_size: 2,
          sort: "created_at ASC",
        } satisfies IHealthcarePlatformInsuranceApiIntegration.IRequest,
      },
    );
  typia.assert(ascPage);
  if (ascPage.data.length > 1) {
    TestValidator.predicate(
      "Ascending created_at order",
      ascPage.data[0].created_at <= ascPage.data[1].created_at,
    );
  }

  // 9. Request far-past (high number) page to verify empty result
  const maxPage =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.index(
      connection,
      {
        body: {
          organization_id: orgId,
          page: 100,
          page_size: 10,
        } satisfies IHealthcarePlatformInsuranceApiIntegration.IRequest,
      },
    );
  typia.assert(maxPage);
  TestValidator.equals("No data for high page", maxPage.data.length, 0);
}
