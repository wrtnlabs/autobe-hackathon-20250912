import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test that a systemAdmin can retrieve the full detail for a specific outcome
 * metric by metricId.
 *
 * 1. SystemAdmin register/join (business email)
 * 2. SystemAdmin login
 * 3. Create new outcome metric as systemAdmin
 * 4. Retrieve metric by ID and assert all important fields are correct
 * 5. GET with non-existent metricId returns error
 * 6. GET with unauthenticated connection returns error
 */
export async function test_api_outcome_metric_detail_system_admin_access(
  connection: api.IConnection,
) {
  // 1. SystemAdmin registration (join)
  const sysAdminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@enterprise-corp.com`;
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const joinResp = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinResp);
  TestValidator.equals(
    "system admin join email matches",
    joinResp.email,
    sysAdminEmail,
  );

  // 2. SystemAdmin login (ensure credential is valid)
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResp);
  TestValidator.equals(
    "system admin login email matches",
    loginResp.email,
    sysAdminEmail,
  );

  // 3. Create outcome metric
  const outcomeCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    metric_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 10,
      wordMax: 15,
    }),
    cohort_definition_json: '{"criteria": ["age>65"]}',
    observed_value: Math.round(Math.random() * 10000 * 100) / 100,
    observed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;
  const createdMetric =
    await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.create(
      connection,
      {
        body: outcomeCreate,
      },
    );
  typia.assert(createdMetric);
  TestValidator.equals(
    "metric name matches",
    createdMetric.metric_name,
    outcomeCreate.metric_name,
  );
  TestValidator.equals(
    "organization_id matches",
    createdMetric.organization_id,
    outcomeCreate.organization_id,
  );
  TestValidator.equals(
    "department_id matches",
    createdMetric.department_id,
    outcomeCreate.department_id,
  );
  TestValidator.equals(
    "observed_value matches",
    createdMetric.observed_value,
    outcomeCreate.observed_value,
  );
  TestValidator.equals(
    "cohort definition matches",
    createdMetric.cohort_definition_json,
    outcomeCreate.cohort_definition_json,
  );
  TestValidator.equals(
    "observed_at matches",
    createdMetric.observed_at,
    outcomeCreate.observed_at,
  );
  TestValidator.equals(
    "description matches",
    createdMetric.description,
    outcomeCreate.description,
  );

  // 4. Retrieve by ID and verify
  const retrieved =
    await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.at(
      connection,
      {
        metricId: createdMetric.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved id matches created",
    retrieved.id,
    createdMetric.id,
  );
  TestValidator.equals(
    "retrieved metric_name matches",
    retrieved.metric_name,
    outcomeCreate.metric_name,
  );
  TestValidator.equals(
    "retrieved organization_id matches",
    retrieved.organization_id,
    outcomeCreate.organization_id,
  );
  TestValidator.equals(
    "retrieved department_id matches",
    retrieved.department_id,
    outcomeCreate.department_id,
  );
  TestValidator.equals(
    "retrieved observed_value matches",
    retrieved.observed_value,
    outcomeCreate.observed_value,
  );
  TestValidator.equals(
    "retrieved cohort definition matches",
    retrieved.cohort_definition_json,
    outcomeCreate.cohort_definition_json,
  );
  TestValidator.equals(
    "retrieved observed_at matches",
    retrieved.observed_at,
    outcomeCreate.observed_at,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrieved.description,
    outcomeCreate.description,
  );
  TestValidator.predicate(
    "retrieved created_at is ISO datetime",
    typeof retrieved.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+/.test(retrieved.created_at),
  );
  TestValidator.predicate(
    "retrieved updated_at is ISO datetime",
    typeof retrieved.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+/.test(retrieved.updated_at),
  );

  // 5. GET with non-existent metricId (expect error)
  await TestValidator.error(
    "get with random metricId returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.at(
        connection,
        {
          metricId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. GET with unauthenticated connection (expect error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated connection cannot get outcome metric",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.outcomeMetrics.at(
        unauthConn,
        {
          metricId: createdMetric.id,
        },
      );
    },
  );
}
