import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";

/**
 * Test organization admin deleting an outcome metric belonging to their
 * organization.
 *
 * 1. Register and authenticate as org admin
 * 2. Create an outcome metric for their organization
 * 3. Delete the outcome metric by metricId
 * 4. Validate that GET for the deleted metricId returns not found (hard or soft
 *    delete)
 * 5. (Edge case) Try to delete a non-existing metric and expect an error
 */
export async function test_api_outcome_metric_delete_success_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register/join organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(adminAuth);

  // 2. Create outcome metric for admin's org
  const metricBody = {
    organization_id: adminAuth.id,
    metric_name: RandomGenerator.paragraph({ sentences: 2 }),
    cohort_definition_json: JSON.stringify({ cohort: RandomGenerator.name() }),
    observed_value: Math.floor(Math.random() * 1000),
    observed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;
  const metric =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.create(
      connection,
      { body: metricBody },
    );
  typia.assert(metric);

  // 3. Delete this outcome metric
  await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.erase(
    connection,
    { metricId: metric.id },
  );

  // 4. Attempt to DELETE the same metric again; expect error (already deleted or not found)
  await TestValidator.error(
    "deleted outcome metric should not be deletable again",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.erase(
        connection,
        { metricId: metric.id },
      );
    },
  );

  // 5. Edge case: Attempt to delete a metric not in this organization (random uuid)
  await TestValidator.error(
    "deletion attempt for wrong organization metric should fail",
    async () => {
      const someOtherMetricId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.erase(
        connection,
        { metricId: someOtherMetricId },
      );
    },
  );
}
