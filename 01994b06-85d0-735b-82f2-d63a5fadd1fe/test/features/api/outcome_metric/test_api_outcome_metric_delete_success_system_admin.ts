import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test successful hard delete of an outcome metric by system admin.
 *
 * 1. Register a system admin (email, name, password, phone, provider)
 * 2. Create an outcome metric as system admin (need metricId for deletion)
 * 3. Delete the metric using DELETE endpoint
 * 4. Attempt to delete the same metric again (should fail)
 * 5. Attempt to delete a non-existent metric (should fail)
 *
 * Note: Audit log validation is skipped as audit API is not available.
 */
export async function test_api_outcome_metric_delete_success_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a system admin
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(14),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create an outcome metric
  const metric =
    await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null, // optional, test at org level
          metric_name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          cohort_definition_json: JSON.stringify({
            inclusion: "adult",
            size: 100,
          }),
          observed_value: Math.floor(Math.random() * 10000),
          observed_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformOutcomeMetric.ICreate,
      },
    );
  typia.assert(metric);

  // Step 3: Delete the metric
  await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.erase(
    connection,
    { metricId: metric.id },
  );

  // Step 4: Try deleting again (should fail, error)
  await TestValidator.error(
    "re-deleting the deleted metric should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.erase(
        connection,
        { metricId: metric.id },
      );
    },
  );

  // Step 5: Try deleting a non-existent metric (should fail, error)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a non-existent metric should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.erase(
        connection,
        { metricId: randomId },
      );
    },
  );
}
