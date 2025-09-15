import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * Test organization admin analytics report search and scoping.
 *
 * 1. Register an organization admin and login to establish authentication context.
 * 2. Issue a search for analytics reports with only the required filters
 *    (empty/default search body).
 * 3. Validate the response data structure and confirm all returned reports (if
 *    any) have consistent organization_id fields.
 * 4. Perform advanced search with created_by_user_id and is_active set; confirm
 *    results have correct fields if available.
 * 5. Test pagination and sorting: use page/limit/sort/order and verify response
 *    ordering (if multiple results).
 * 6. Attempt cross-tenant search (random UUID as organization_id) and confirm
 *    leakage does not occur.
 * 7. Submit intentionally invalid filter combinations (bad UUID, page=-1, etc.)
 *    and expect error or empty results.
 */
export async function test_api_orgadmin_analyticsreport_search_and_access_scope(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "TestPassw0rd!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminJoinInput.email,
        password: adminJoinInput.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 2. Search analytics reports with required/default only
  const defaultRequest =
    {} satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const defaultPage =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.index(
      connection,
      { body: defaultRequest },
    );
  typia.assert(defaultPage);

  // 3. Validate results structure and org consistency (if any reports found)
  if (defaultPage.data.length > 0) {
    const orgIds = Array.from(
      new Set(defaultPage.data.map((r) => r.organization_id)),
    );
    TestValidator.predicate(
      "default search: organization_ids are consistent",
      orgIds.length === 1,
    );
  }

  // 4. Advanced filter: search with created_by_user_id (admin's id) and is_active
  const advSearchRequest = {
    created_by_user_id: admin.id,
    is_active: true,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const advSearchPage =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.index(
      connection,
      { body: advSearchRequest },
    );
  typia.assert(advSearchPage);
  if (advSearchPage.data.length > 0) {
    TestValidator.predicate(
      "advanced search: results created by this admin & active",
      advSearchPage.data.every(
        (x) => x.created_by_user_id === admin.id && x.is_active === true,
      ),
    );
  }

  // 5. Pagination + sorting (sort: created_at desc, limit 2, page 1)
  const pagedSearchRequest = {
    limit: 2,
    page: 1,
    sort: "created_at",
    order: "desc",
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const pagedPage =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.index(
      connection,
      { body: pagedSearchRequest },
    );
  typia.assert(pagedPage);
  TestValidator.equals("pagination page is 1", pagedPage.pagination.current, 1);
  TestValidator.equals("pagination limit is 2", pagedPage.pagination.limit, 2);
  if (pagedPage.data.length > 1) {
    TestValidator.predicate(
      "sorting order desc (created_at)",
      pagedPage.data.every(
        (r, i, arr) => i === 0 || r.created_at <= arr[i - 1].created_at,
      ),
    );
  }

  // 6. Cross-tenant/leakage: search as other org
  let otherOrgId = typia.random<string & tags.Format<"uuid">>();
  while (otherOrgId === admin.id)
    otherOrgId = typia.random<string & tags.Format<"uuid">>();
  const crossTenantRequest = {
    organization_id: otherOrgId,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const crossTenantPage =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.index(
      connection,
      { body: crossTenantRequest },
    );
  typia.assert(crossTenantPage);
  TestValidator.equals(
    "cross-tenant: no report leakage",
    crossTenantPage.data.length,
    0,
  );

  // 7. Invalid filter combinations (bad UUID, negative page/limit)
  const badRequest = {
    organization_id: "BAD-UUID",
    page: -1,
    limit: -10,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  await TestValidator.error(
    "invalid filters: error or empty result",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.index(
        connection,
        { body: badRequest },
      );
    },
  );
}
