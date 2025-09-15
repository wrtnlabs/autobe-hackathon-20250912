import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";

/**
 * Validate access control for outcome metric detail retrieval by organization
 * admin.
 *
 * This test confirms that:
 *
 * - An authenticated organization admin can retrieve the details of an outcome
 *   metric for their own organization (and, if present, their department).
 * - An admin from a different organization is forbidden (or receives 404) when
 *   accessing the metric.
 * - Unauthenticated and invalid token requests are rejected.
 * - Business fields (id, org/dept, metric_name, value, calculation fields,
 *   timestamps, etc.) are returned as required.
 * - Audit log of access is performed (not directly checkable here, so commented
 *   as a compliance note).
 *
 * Steps:
 *
 * 1. Register and login as org-admin-1.
 * 2. Create outcome metric in org-admin-1's org/dept.
 * 3. Retrieve metric as org-admin-1; validate all fields match and are present.
 * 4. Register and login as org-admin-2 (separate org).
 * 5. Attempt to retrieve org-admin-1's metric as org-admin-2; expect
 *    forbidden/404.
 * 6. Attempt to retrieve non-existent metricId; expect 404.
 * 7. Attempt to retrieve org-admin-1's metric unauthenticated and with invalid
 *    token; expect rejection.
 * 8. (Comment) Audit log verification could be done if API exposed audit read
 *    endpoints.
 */
export async function test_api_outcome_metric_detail_organization_admin_authz(
  connection: api.IConnection,
) {
  // 1. Register & login org-admin-1
  const admin1_email = typia.random<string & tags.Format<"email">>();
  const admin1_full_name = RandomGenerator.name();
  const admin1_password = RandomGenerator.alphaNumeric(12);
  const join1 = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: admin1_email,
      full_name: admin1_full_name,
      password: admin1_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(join1);
  const org_id = join1.id;

  // Explicit login, in case tokens behave differently
  const login1 = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1_email,
      password: admin1_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(login1);

  // 2. Create outcome metric for this org
  const department_id = typia.random<string & tags.Format<"uuid">>();
  const metricCreate = {
    organization_id: org_id,
    department_id: department_id,
    metric_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    cohort_definition_json: JSON.stringify({ condition: "test" }),
    observed_value: 123.45,
    observed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformOutcomeMetric.ICreate;
  const metric =
    await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.create(
      connection,
      { body: metricCreate },
    );
  typia.assert(metric);

  // 3. Retrieve metric as org-admin-1
  {
    const fetched =
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.at(
        connection,
        { metricId: metric.id },
      );
    typia.assert(fetched);
    TestValidator.equals(
      "organization_id matches",
      fetched.organization_id,
      org_id,
    );
    TestValidator.equals(
      "department_id matches",
      fetched.department_id,
      department_id,
    );
    TestValidator.equals(
      "fetched metric matches create",
      fetched.metric_name,
      metricCreate.metric_name,
    );
    TestValidator.equals(
      "observed_value matches",
      fetched.observed_value,
      metricCreate.observed_value,
    );
    TestValidator.equals(
      "observed_at matches",
      fetched.observed_at,
      metricCreate.observed_at,
    );
  }

  // 4. Register & login org-admin-2 (different org)
  const admin2_email = typia.random<string & tags.Format<"email">>();
  const admin2_full_name = RandomGenerator.name();
  const admin2_password = RandomGenerator.alphaNumeric(12);
  const join2 = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: admin2_email,
      full_name: admin2_full_name,
      password: admin2_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(join2);

  const login2 = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin2_email,
      password: admin2_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(login2);

  // 5. Attempt to access org-admin-1's metric as org-admin-2 (should be forbidden or 404)
  await TestValidator.error(
    "admin from other org forbidden on outcome metric detail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.at(
        connection,
        { metricId: metric.id },
      );
    },
  );

  // 6. Attempt to fetch a totally non-existent metricId
  await TestValidator.error(
    "fetching non-existent metricId should 404",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.at(
        connection,
        { metricId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 7. No authentication (simulate by using fresh connection without token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated organization admin forbidden outcome metric detail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.at(
        unauthConn,
        { metricId: metric.id },
      );
    },
  );
  // And with invalid/expired token
  const badConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer INVALID_TOKEN" },
  };
  await TestValidator.error(
    "invalid token forbidden on org-admin outcome metric detail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.outcomeMetrics.at(
        badConn,
        { metricId: metric.id },
      );
    },
  );

  // 8. Audit log is required per org security policy (checkable if/when API exposes audit endpoint)
  // If such endpoint exists, a real test would retrieve the audit trail for this operation and validate the access was logged.
}
