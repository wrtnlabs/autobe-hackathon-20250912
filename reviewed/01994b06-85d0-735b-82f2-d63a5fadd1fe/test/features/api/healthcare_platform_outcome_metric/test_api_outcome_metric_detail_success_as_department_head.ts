import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";

/**
 * Department head retrieves an existing outcome metric by metricId after
 * logging in.
 *
 * Steps:
 *
 * 1. Register a new department head (unique email, name, password)
 * 2. Login as the department head (same credentials)
 * 3. Create an outcome metric (captures org, department, metric name, cohort,
 *    value, etc.)
 * 4. Retrieve the created outcome metric by its id
 * 5. Validate all critical details in the returned metric
 */
export async function test_api_outcome_metric_detail_success_as_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(10);
  const join: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email,
        full_name,
        password,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(join);
  TestValidator.equals("joined email equals input", join.email, email);

  // 2. Login as department head
  const login: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: {
        email,
        password,
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    });
  typia.assert(login);
  TestValidator.equals("login email equals input", login.email, email);

  // 3. Create outcome metric
  // Use department/organization as random UUIDs
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const department_id = typia.random<string & tags.Format<"uuid">>();
  const metric_name = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const cohort_definition_json = JSON.stringify({
    cohort: "test cohort",
    age: { min: 18, max: 65 },
    diagnosis: ["X", "Y"],
  });
  const observed_value = Math.round(Math.random() * 1000) / 10;
  const observed_at = new Date().toISOString();

  const create =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.create(
      connection,
      {
        body: {
          organization_id,
          department_id,
          metric_name,
          description,
          cohort_definition_json,
          observed_value,
          observed_at,
        } satisfies IHealthcarePlatformOutcomeMetric.ICreate,
      },
    );
  typia.assert(create);
  TestValidator.equals(
    "created metric name equals input",
    create.metric_name,
    metric_name,
  );
  TestValidator.equals(
    "created cohort json equals input",
    create.cohort_definition_json,
    cohort_definition_json,
  );

  // 4. Retrieve metric by id
  const output =
    await api.functional.healthcarePlatform.departmentHead.outcomeMetrics.at(
      connection,
      { metricId: create.id },
    );
  typia.assert(output);

  // 5. Validate details
  TestValidator.equals(
    "retrieved metric id matches created",
    output.id,
    create.id,
  );
  TestValidator.equals(
    "retrieved metric name matches input",
    output.metric_name,
    metric_name,
  );
  TestValidator.equals(
    "retrieved observed value matches input",
    output.observed_value,
    observed_value,
  );
  TestValidator.equals(
    "retrieved cohort definition matches",
    output.cohort_definition_json,
    cohort_definition_json,
  );
  TestValidator.equals(
    "retrieved organization id matches",
    output.organization_id,
    organization_id,
  );
  TestValidator.equals(
    "retrieved department id matches",
    output.department_id,
    department_id,
  );
  TestValidator.equals(
    "retrieved observed_at matches",
    output.observed_at,
    observed_at,
  );
}
