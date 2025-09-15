import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";

/**
 * Test updating an outcome metric as an organization admin user. Validates
 * success case where metricId, organization_id, department_id are provided and
 * only allowed fields are patched, with audit/history tracked.
 */
export async function test_api_outcome_metric_update_success_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuth);

  // 2. Create an outcome metric as this admin
  const createMetricBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    metric_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    cohort_definition_json: JSON.stringify({ filter: RandomGenerator.name() }),
    observed_value: typia.random<number>(),
    observed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;

  const metric =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.create(
      connection,
      {
        body: createMetricBody,
      },
    );
  typia.assert(metric);

  // 3. Prepare update body: update a subset of allowed fields
  const updateBody = {
    metric_name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    observed_value: (metric.observed_value ?? 0) + 1,
  } satisfies IHealthcarePlatformOutcomeMetric.IUpdate;

  // 4. Update the outcome metric
  const updatedMetric =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.update(
      connection,
      {
        metricId: metric.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMetric);

  // 5. Validate fields have changed as expected
  TestValidator.equals(
    "metric_name updated",
    updatedMetric.metric_name,
    updateBody.metric_name,
  );
  TestValidator.equals(
    "description updated",
    updatedMetric.description,
    updateBody.description,
  );
  TestValidator.equals(
    "observed_value updated",
    updatedMetric.observed_value,
    updateBody.observed_value,
  );

  // 6. Validate unchanged fields remain unchanged
  TestValidator.equals(
    "organization_id unchanged",
    updatedMetric.organization_id,
    metric.organization_id,
  );
  TestValidator.equals(
    "department_id unchanged",
    updatedMetric.department_id,
    metric.department_id,
  );
  TestValidator.equals(
    "cohort_definition_json unchanged (should be unchanged since not patched)",
    updatedMetric.cohort_definition_json,
    metric.cohort_definition_json,
  );

  // 7. Audit/history fields: updated_at is refreshed
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedMetric.updated_at).getTime() >=
      new Date(updatedMetric.created_at).getTime(),
  );
  TestValidator.equals("id stays constant", updatedMetric.id, metric.id);
}
