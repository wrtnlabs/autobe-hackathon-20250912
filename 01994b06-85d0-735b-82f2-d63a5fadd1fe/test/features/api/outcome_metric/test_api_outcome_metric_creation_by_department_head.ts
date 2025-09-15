import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";

/**
 * Test creation of an outcome metric by a department head with uniqueness
 * validation.
 *
 * Steps:
 *
 * 1. Register a new department head (join), providing unique email and required
 *    info.
 * 2. Login with the department head credentials.
 * 3. Compose all required fields to create an outcome metric (organization_id,
 *    dept_id, metric_name, etc) using RandomGenerator and typia.random.
 * 4. Call the creation API and assert that the returned metric object matches the
 *    input and schema.
 * 5. Attempt to create a duplicate metric with the same (metric_name, observed_at,
 *    organization_id/department_id). Expect a uniqueness violation error.
 */
export async function test_api_outcome_metric_creation_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register a department head and capture all fields
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const joinOutput = await api.functional.auth.departmentHead.join(connection, {
    body: joinInput,
  });
  typia.assert(joinOutput);
  TestValidator.equals(
    "email matches on registration",
    joinOutput.email,
    joinInput.email,
  );

  // 2. Login with the same email/password
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loginOutput = await api.functional.auth.departmentHead.login(
    connection,
    { body: loginInput },
  );
  typia.assert(loginOutput);
  TestValidator.equals(
    "login email matches",
    loginOutput.email,
    joinOutput.email,
  );

  // 3. Compose a metric payload
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const department_id = typia.random<string & tags.Format<"uuid">>();
  const metricPayload = {
    organization_id,
    department_id,
    metric_name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph(),
    cohort_definition_json: '{"patients":10, "criteria":"age>60"}',
    observed_value: 24.5,
    observed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;

  // 4. Create the outcome metric
  const createdMetric =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.create(
      connection,
      {
        body: metricPayload,
      },
    );
  typia.assert(createdMetric);
  TestValidator.equals(
    "created metric org matches",
    createdMetric.organization_id,
    organization_id,
  );
  TestValidator.equals(
    "created metric department matches",
    createdMetric.department_id,
    department_id,
  );
  TestValidator.equals(
    "created metric name matches",
    createdMetric.metric_name,
    metricPayload.metric_name,
  );
  TestValidator.equals(
    "created metric observed_value matches",
    createdMetric.observed_value,
    metricPayload.observed_value,
  );
  TestValidator.equals(
    "created metric observed_at matches",
    createdMetric.observed_at,
    metricPayload.observed_at,
  );

  // 5. Attempt duplicate creation - same metric_name, organization_id, department_id and observed_at
  await TestValidator.error(
    "duplicate metric uniqueness violation",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.create(
        connection,
        {
          body: {
            ...metricPayload,
          },
        },
      );
    },
  );
}
