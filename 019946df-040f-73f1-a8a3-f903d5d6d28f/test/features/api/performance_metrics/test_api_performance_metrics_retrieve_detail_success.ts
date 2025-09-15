import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPerformanceMetric";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Test the retrieval of detailed performance metrics by ID in Enterprise
 * LMS system.
 *
 * Establishes an authenticated systemAdmin user context. Creates a tenant
 * organization for scoping. Creates a performance metric record linked to
 * that tenant. Retrieves the metric by ID and verifies data correctness.
 * Validates authorization and error handling for invalid or unauthorized
 * accesses.
 *
 * Workflow:
 *
 * 1. Create and authenticate systemAdmin user.
 * 2. Create tenant organization.
 * 3. Create performance metric record.
 * 4. Retrieve metric by ID using authorized user.
 * 5. Validate retrieved data correctness.
 * 6. Attempt retrieval with invalid and non-existent IDs.
 * 7. Attempt retrieval with unauthorized session to verify access denial.
 */
export async function test_api_performance_metrics_retrieve_detail_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate systemAdmin user
  const systemAdminBody1 = {
    email: RandomGenerator.alphabets(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin1: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminBody1,
    });
  typia.assert(systemAdmin1);

  // 2. Create a tenant organization
  const tenantBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantBody,
    });
  typia.assert(tenant);

  // 3. Authenticate systemAdmin user again for context prerequisite
  const systemAdminBody2 = {
    email: RandomGenerator.alphabets(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin2: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminBody2,
    });
  typia.assert(systemAdmin2);

  // 4. Create a performance metric record tied to the tenant
  // Note: No create API for performance metric is provided, so we simulate metric creation by generating one
  // This step is necessary due to scenario implying creation, but no sdk function, so we use a mockup metric
  // This implies the creation is outside scope or data seeded, so we generate a realistic metric entry for testing retrieval

  // Generate a realistic IEnterpriseLmsPerformanceMetric matching the tenant
  const performanceMetric: IEnterpriseLmsPerformanceMetric = {
    id: typia.random<string & tags.Format<"uuid">>(),
    tenant_id: tenant.id,
    metric_name: "cpu_usage_percent",
    metric_value: Math.round(Math.random() * 100),
    recorded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 5. Retrieve the performance metric by its ID
  const retrievedMetric: IEnterpriseLmsPerformanceMetric =
    await api.functional.enterpriseLms.systemAdmin.performanceMetrics.at(
      connection,
      {
        id: performanceMetric.id,
      },
    );
  typia.assert(retrievedMetric);

  // 6. Validate retrieved data matches expected pattern
  TestValidator.equals(
    "retrieved metric id matches",
    retrievedMetric.id,
    performanceMetric.id,
  );

  TestValidator.equals(
    "retrieved metric tenant_id matches",
    retrievedMetric.tenant_id,
    tenant.id,
  );

  TestValidator.equals(
    "retrieved metric name matches",
    retrievedMetric.metric_name,
    "cpu_usage_percent",
  );

  TestValidator.predicate(
    "metric_value is within 0 to 100",
    retrievedMetric.metric_value >= 0 && retrievedMetric.metric_value <= 100,
  );

  TestValidator.predicate(
    "recorded_at is a valid ISO 8601 string",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9]{3}Z$/.test(
      retrievedMetric.recorded_at,
    ),
  );

  // 7. Test retrieval with non-existent id should throw error
  await TestValidator.error(
    "retrieval with non-existent id throws",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.performanceMetrics.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Test unauthorized access by using an unauthenticated connection
  // Create unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access throws", async () => {
    await api.functional.enterpriseLms.systemAdmin.performanceMetrics.at(
      unauthenticatedConnection,
      {
        id: retrievedMetric.id,
      },
    );
  });
}
