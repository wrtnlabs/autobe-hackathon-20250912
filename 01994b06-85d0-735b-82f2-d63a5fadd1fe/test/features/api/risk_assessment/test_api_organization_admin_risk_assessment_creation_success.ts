import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";

/**
 * Organization admin onboarding and risk assessment creation:
 *
 * 1. Register a new organization admin via the join endpoint.
 * 2. Use credentials to authenticate (token is handled automatically by SDK).
 * 3. Build a valid risk assessment DTO, referencing the admin's organization_id
 *    and supplying all required properties. Optional fields are supplied with
 *    test values (random UUIDs for department/assessor; string or null for
 *    recommendations).
 * 4. Call the create risk assessment endpoint.
 * 5. Assert the result's organization_id matches that from registration, and all
 *    returned fields are as requested. Perform type assertion on response
 *    value.
 */
export async function test_api_organization_admin_risk_assessment_creation_success(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "P@ssw0rd!Test",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  TestValidator.equals("admin email echo", admin.email, joinInput.email);
  const orgId = typia.assert(admin.id);

  // 2. Build risk assessment DTO
  const now = new Date();
  const windowStart = now.toISOString();
  const windowEnd = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const riskAssessmentInput = {
    organization_id: orgId,
    assessment_type: "annual",
    status: "in_progress",
    methodology: "NIST CSF",
    risk_level: RandomGenerator.pick([
      "low",
      "moderate",
      "high",
      "critical",
    ] as const),
    window_start: windowStart,
    window_end: windowEnd,
    assessor_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    recommendations: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHealthcarePlatformRiskAssessment.ICreate;

  // 3. Create risk assessment
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.create(
      connection,
      { body: riskAssessmentInput },
    );
  typia.assert(result);
  TestValidator.equals(
    "matched organization id",
    result.organization_id,
    riskAssessmentInput.organization_id,
  );
  TestValidator.equals(
    "assessment type echo",
    result.assessment_type,
    riskAssessmentInput.assessment_type,
  );
  TestValidator.equals(
    "status echo",
    result.status,
    riskAssessmentInput.status,
  );
  TestValidator.equals(
    "methodology echo",
    result.methodology,
    riskAssessmentInput.methodology,
  );
  TestValidator.equals(
    "risk level echo",
    result.risk_level,
    riskAssessmentInput.risk_level,
  );
  TestValidator.equals(
    "window start echo",
    result.window_start,
    riskAssessmentInput.window_start,
  );
  TestValidator.equals(
    "window end echo",
    result.window_end,
    riskAssessmentInput.window_end,
  );
  TestValidator.equals(
    "assessor id echo",
    result.assessor_id,
    riskAssessmentInput.assessor_id,
  );
  TestValidator.equals(
    "department id echo",
    result.department_id,
    riskAssessmentInput.department_id,
  );
  TestValidator.equals(
    "recommendations echo",
    result.recommendations,
    riskAssessmentInput.recommendations,
  );
}
