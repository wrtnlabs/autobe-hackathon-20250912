import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";

/**
 * Organization admin outcome metric creation full workflow and uniqueness
 * validation
 *
 * This test performs prerequisites by registering a new organization admin,
 * authenticating as that admin, then creating a new outcome metric for a target
 * organization and department. All fields—including metric_name,
 * cohort_definition_json, observed_value, organization_id, department_id,
 * observed_at, and optional description—are populated with random data. After
 * validating the API response and property matches, the test attempts to create
 * a duplicate record using the same metric_name, observed_at, organization_id,
 * and department_id; it asserts that an error is thrown due to uniqueness
 * constraints.
 *
 * Steps:
 *
 * 1. Register a new organization admin
 * 2. Login as that admin
 * 3. Create an outcome metric with randomized data
 * 4. Validate successful creation and property values
 * 5. Attempt duplicate creation and expect an error
 */
export async function test_api_outcome_metric_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuth);

  // 2. Login as that admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Prepare input for the outcome metric
  const organization_id = adminAuth.id;
  const department_id = typia.random<string & tags.Format<"uuid">>();
  const metric_name = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 12,
  });
  const cohort_definition_json = JSON.stringify({
    filter: "age>65",
    generated: RandomGenerator.content({ paragraphs: 1 }),
  });
  const observed_value = Math.round(Math.random() * 1000) / 10;
  const observed_at = new Date(
    Date.now() - Math.floor(Math.random() * 1e7),
  ).toISOString();
  const description = RandomGenerator.paragraph({ sentences: 2 });

  const metricCreateBody = {
    organization_id,
    department_id,
    metric_name,
    cohort_definition_json,
    observed_value,
    observed_at,
    description,
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;
  // 4. Create the outcome metric
  const createdMetric =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.create(
      connection,
      { body: metricCreateBody },
    );
  typia.assert(createdMetric);

  TestValidator.equals(
    "organization_id matches input",
    createdMetric.organization_id,
    organization_id,
  );
  TestValidator.equals(
    "department_id matches input",
    createdMetric.department_id,
    department_id,
  );
  TestValidator.equals(
    "metric_name matches",
    createdMetric.metric_name,
    metric_name,
  );
  TestValidator.equals(
    "cohort_definition_json matches",
    createdMetric.cohort_definition_json,
    cohort_definition_json,
  );
  TestValidator.equals(
    "observed_value matches",
    createdMetric.observed_value,
    observed_value,
  );
  TestValidator.equals(
    "observed_at matches",
    createdMetric.observed_at,
    observed_at,
  );
  TestValidator.equals(
    "description matches",
    createdMetric.description,
    description,
  );

  // 5. Attempt duplicate metric creation, expect uniqueness constraint violation
  await TestValidator.error(
    "duplicate outcome metric creation must be rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.create(
        connection,
        { body: { ...metricCreateBody } },
      );
    },
  );
}
