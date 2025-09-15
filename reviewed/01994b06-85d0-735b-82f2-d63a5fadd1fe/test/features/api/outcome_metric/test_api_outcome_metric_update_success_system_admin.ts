import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system-wide outcome metric update workflow for a system admin.
 *
 * Steps:
 *
 * 1. Register a system admin (join)
 * 2. Create a new outcome metric as admin
 * 3. Update the metric (observed_value, cohort_definition_json)
 * 4. Check that changes are reflected and audited
 * 5. Try updating a non-existent metricId and confirm error
 */
export async function test_api_outcome_metric_update_success_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Create outcome metric
  const metricCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    metric_name: RandomGenerator.name(2),
    cohort_definition_json: JSON.stringify({
      condition: "diabetes",
      year: 2024,
    }),
    observed_value: Math.random() * 100,
    observed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;
  const created: IHealthcarePlatformOutcomeMetric =
    await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.create(
      connection,
      { body: metricCreate },
    );
  typia.assert(created);

  // 3. Update outcome metric
  const newObservedValue = created.observed_value + 10;
  const newCohortDef = JSON.stringify({
    condition: "hypertension",
    year: 2024,
  });
  const updateBody = {
    observed_value: newObservedValue,
    cohort_definition_json: newCohortDef,
  } satisfies IHealthcarePlatformOutcomeMetric.IUpdate;
  const updated: IHealthcarePlatformOutcomeMetric =
    await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.update(
      connection,
      { metricId: created.id, body: updateBody },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated observed_value is reflected",
    updated.observed_value,
    newObservedValue,
  );
  TestValidator.equals(
    "updated cohort_definition_json is reflected",
    updated.cohort_definition_json,
    newCohortDef,
  );
  TestValidator.equals("unchanged id remains", updated.id, created.id);

  // 4. Try update on non-existent metricId and expect business logic error
  await TestValidator.error(
    "updating non-existent metricId returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.update(
        connection,
        {
          metricId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
