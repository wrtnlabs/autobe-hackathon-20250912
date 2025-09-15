import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPerformanceMetric";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsPerformanceMetric";

/**
 * Validates the listing of performance metrics under authenticated tenant
 * admin access.
 *
 * Ensures multi-tenant authorization, filtering, and pagination
 * correctness.
 *
 * 1. Calls authentication endpoint to join as an organization admin.
 * 2. Validates authorized response and extracts tenant_id.
 * 3. Calls performance metrics list endpoint with tenant scoping.
 * 4. Validates response contents for tenant consistency and pagination
 *    correctness.
 */
export async function test_api_performance_metrics_listing_with_authentication(
  connection: api.IConnection,
) {
  // 1. Authenticate as organization admin user
  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare performance metrics list request with tenant filtering.
  const listRequestBody: IEnterpriseLmsPerformanceMetric.IRequest = {
    tenant_id: admin.tenant_id,
    page: 1,
    limit: 10,
  };

  // 3. Retrieve the list of performance metrics
  const listResponse: IPageIEnterpriseLmsPerformanceMetric =
    await api.functional.enterpriseLms.organizationAdmin.performanceMetrics.index(
      connection,
      { body: listRequestBody },
    );
  typia.assert(listResponse);

  // 4. Validate that all returned records belong to the authenticated tenant
  for (const metric of listResponse.data) {
    TestValidator.predicate(
      "all performance metrics belong to tenant",
      metric.tenant_id === admin.tenant_id,
    );
  }

  // 5. Validate pagination metadata correctness
  const { pagination } = listResponse;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination pages is at least 1",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    listResponse.data.length <= pagination.limit,
  );
}
