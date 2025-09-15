import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPerformanceMetric";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsPerformanceMetric";

/**
 * Validate system performance metrics search with pagination and
 * authorization.
 *
 * This test covers the following user journey:
 *
 * 1. Register a new system administrator (join API) with realistic data.
 * 2. Authenticate the system administrator (login API) to receive JWT tokens.
 * 3. Perform a performance metrics search request with required tenant_id
 *    included and other optional filters omitted or minimal.
 * 4. Validate the paginated response structure and metrics data integrity.
 * 5. Test that attempting to search without authorization results in an error.
 * 6. Test that search without required tenant_id fails with error.
 *
 * All API calls must use valid data per schema constraints. Authentication
 * must be done by calls to auth APIs; no manual header manipulation.
 */
export async function test_api_performance_metrics_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator
  const joinBody = {
    email: RandomGenerator.alphabets(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(systemAdmin);

  // 2. Authenticate the system administrator
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedInAdmin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInAdmin);

  // 3. Perform performance metrics search with tenant_id
  const requestBody = {
    tenant_id: loggedInAdmin.tenant_id,
  } satisfies IEnterpriseLmsPerformanceMetric.IRequest;
  const metricsPage =
    await api.functional.enterpriseLms.systemAdmin.performanceMetrics.index(
      connection,
      { body: requestBody },
    );
  typia.assert(metricsPage);

  // Validate pagination info
  TestValidator.predicate(
    "pagination current page number is >= 0",
    metricsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is > 0",
    metricsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    metricsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    metricsPage.pagination.records >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(metricsPage.data));
  if (metricsPage.data.length > 0) {
    // Assert each metric has required properties
    for (const metric of metricsPage.data) {
      typia.assert(metric);
      TestValidator.equals(
        "performance metric tenant id matches request tenant id",
        metric.tenant_id ?? null,
        loggedInAdmin.tenant_id,
      );
      TestValidator.predicate(
        "metric_value is a number",
        typeof metric.metric_value === "number",
      );
    }
  }

  // 4. Test unauthorized access - create unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized search should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.performanceMetrics.index(
      unauthConnection,
      { body: requestBody },
    );
  });

  // 5. Test search missing required tenant_id
  const missingTenantRequest =
    {} satisfies IEnterpriseLmsPerformanceMetric.IRequest;

  await TestValidator.error(
    "search without tenant_id should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.performanceMetrics.index(
        connection,
        { body: missingTenantRequest },
      );
    },
  );
}
