import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test creation of risk assessment as system admin.
 *
 * 1. Register and log in as a system admin.
 * 2. Create a risk assessment with all valid/required information -> expect
 *    success.
 * 3. Attempt to create as unauthorized user (simulate by unauth conn) -> expect
 *    error.
 */
export async function test_api_risk_assessment_creation_as_system_admin(
  connection: api.IConnection,
) {
  // 1. Register (join) as system admin and get a valid connection.
  const sysAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(12),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: sysAdminBody,
    });
  typia.assert(sysAdmin);

  // 2. Happy path: create risk assessment with valid data
  const validAssessmentCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    assessment_type: RandomGenerator.pick([
      "annual",
      "post-breach",
      "incident",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "in_progress",
      "completed",
    ] as const),
    methodology: RandomGenerator.pick(["NIST CSF", "HIPAA"] as const),
    risk_level: RandomGenerator.pick([
      "low",
      "moderate",
      "high",
      "critical",
    ] as const),
    window_start: new Date().toISOString(),
    window_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    assessor_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    recommendations: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformRiskAssessment.ICreate;
  const assessment =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.create(
      connection,
      { body: validAssessmentCreate },
    );
  typia.assert(assessment);
  TestValidator.equals(
    "risk assessment organization_id matches input",
    assessment.organization_id,
    validAssessmentCreate.organization_id,
  );
  TestValidator.equals(
    "risk assessment type matches",
    assessment.assessment_type,
    validAssessmentCreate.assessment_type,
  );

  // 3. Unauthorized context (simulate by connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "risk assessment creation fails for unauthorized user",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.riskAssessments.create(
        unauthConn,
        { body: validAssessmentCreate },
      );
    },
  );
}
