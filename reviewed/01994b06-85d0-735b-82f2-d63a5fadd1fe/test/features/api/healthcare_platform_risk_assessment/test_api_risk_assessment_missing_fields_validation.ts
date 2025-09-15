import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that risk assessment creation fails only for business logic errors,
 * never for missing required fields or type errors.
 *
 * - Register and authenticate a system admin for context.
 * - Attempt to create a risk assessment with all valid required fields (should
 *   succeed).
 * - Optionally, try a business-logic error with all required types, e.g.,
 *   assessment window dates inverted (window_end before window_start), which
 *   may fail on business rules.
 * - Confirm that business logic errors are caught, and valid requests succeed.
 * - (Cannot directly test audit/compliance logs in this test.)
 */
export async function test_api_risk_assessment_missing_fields_validation(
  connection: api.IConnection,
) {
  // Register and authenticate a system admin
  const adminBody = {
    email: `${RandomGenerator.alphabets(10)}@enterprise-corp.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(15),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Generate a valid risk assessment request
  const validAssessment = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    assessment_type: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.paragraph({ sentences: 1 }),
    methodology: RandomGenerator.paragraph({ sentences: 2 }),
    risk_level: RandomGenerator.pick([
      "low",
      "moderate",
      "high",
      "critical",
    ] as const),
    window_start: new Date(Date.now() - 10000).toISOString(),
    window_end: new Date(Date.now() + 1000000).toISOString(),
    assessor_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    recommendations: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformRiskAssessment.ICreate;

  // Valid creation should succeed
  const assessment =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.create(
      connection,
      { body: validAssessment },
    );
  typia.assert(assessment);
  TestValidator.equals(
    "created risk assessment organization_id should match input",
    assessment.organization_id,
    validAssessment.organization_id,
  );

  // Test business logic error using valid types only - window_end before window_start
  const invalidAssessment = {
    ...validAssessment,
    window_start: new Date(Date.now() + 1000000).toISOString(),
    window_end: new Date(Date.now() - 10000).toISOString(),
  } satisfies IHealthcarePlatformRiskAssessment.ICreate;

  await TestValidator.error(
    "should reject business logic - window_end before window_start",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.riskAssessments.create(
        connection,
        {
          body: invalidAssessment,
        },
      );
    },
  );
}
