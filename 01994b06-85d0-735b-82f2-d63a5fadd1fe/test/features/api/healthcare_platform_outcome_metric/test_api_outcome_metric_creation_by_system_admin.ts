import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for outcome metric creation by system administrator.
 *
 * Scenario:
 *
 * 1. Register as a new system administrator (business email, profile, provider:
 *    'local', password).
 * 2. Login as the system administrator (provider: 'local', password).
 * 3. Create a new outcome metric with all required (and some optional) fields:
 *    organization_id, department_id, metric_name, cohort_definition_json,
 *    observed_value, observed_at, description.
 * 4. Validate the API response: ensure returned metric matches the input and all
 *    generated fields (id, created_at, updated_at) are present and valid.
 * 5. Edge case: attempt to create the same metric again for the same
 *    org/department, metric_name, and observed_at, expect business rule error
 *    (violates uniqueness).
 */
export async function test_api_outcome_metric_creation_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@acme-enterprise.com`;
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const registered: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(registered);
  TestValidator.equals(
    "admin registration email matches",
    registered.email,
    adminJoinBody.email,
  );
  TestValidator.equals(
    "admin registration name matches",
    registered.full_name,
    adminJoinBody.full_name,
  );

  // Step 2: Login as admin
  const loginResult: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: adminJoinBody.password,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(loginResult);
  TestValidator.equals("login email matches", loginResult.email, adminEmail);

  // Step 3: Create new outcome metric
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const deptId = typia.random<string & tags.Format<"uuid">>();
  const metric_name = RandomGenerator.alphabets(12);
  const observedAt = new Date().toISOString();
  const metricCreateBody = {
    organization_id: orgId,
    department_id: deptId,
    metric_name,
    cohort_definition_json: JSON.stringify({
      inclusion: "all-patients",
      logic: "none",
    }),
    observed_value: Math.round(Math.random() * 1000),
    observed_at: observedAt,
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;

  const metric: IHealthcarePlatformOutcomeMetric =
    await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.create(
      connection,
      {
        body: metricCreateBody,
      },
    );
  typia.assert(metric);
  TestValidator.equals(
    "metric organization id matches",
    metric.organization_id,
    orgId,
  );
  TestValidator.equals(
    "metric department id matches",
    metric.department_id,
    deptId,
  );
  TestValidator.equals(
    "metric name matches",
    metric.metric_name,
    metricCreateBody.metric_name,
  );
  TestValidator.equals(
    "metric observed_at matches",
    metric.observed_at,
    observedAt,
  );
  TestValidator.equals(
    "observed value matches",
    metric.observed_value,
    metricCreateBody.observed_value,
  );
  TestValidator.equals(
    "cohort definition matches",
    metric.cohort_definition_json,
    metricCreateBody.cohort_definition_json,
  );
  TestValidator.equals(
    "description matches",
    metric.description,
    metricCreateBody.description,
  );
  // Ensure generated fields
  typia.assert(metric.id);
  typia.assert(metric.created_at);
  typia.assert(metric.updated_at);

  // Step 4: Attempt to create duplicate metric (same metric_name and observed_at in same org/dept)
  await TestValidator.error(
    "duplicate outcome metric creation is forbidden (uniqueness error)",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.create(
        connection,
        {
          body: metricCreateBody,
        },
      );
    },
  );
}
