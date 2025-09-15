import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin can retrieve risk assessment details.
 *
 * Steps:
 *
 * 1. Register a system admin and authenticate
 * 2. Attempt to fetch a risk assessment with a random UUID (should fail: not
 *    found)
 * 3. Fetch a risk assessment with a valid (simulated) UUID (should succeed and
 *    include all expected fields)
 */
export async function test_api_system_admin_risk_assessment_detail_access_and_not_found(
  connection: api.IConnection,
) {
  // Register a system admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@enterprise-corp.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(14),
    phone: undefined,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(systemAdmin);

  // --- Failure: Risk assessment not found ---
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw for non-existent riskAssessmentId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.riskAssessments.at(
        connection,
        { riskAssessmentId: nonExistentId },
      );
    },
  );

  // --- Success: fetch simulated risk assessment details ---
  // (In E2E, typia.random provides us a valid riskAssessmentId for simulation)
  const riskAssessment =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.at(
      connection,
      {
        riskAssessmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(riskAssessment);
  TestValidator.predicate(
    "risk assessment id matches expected format",
    typeof riskAssessment.id === "string" && riskAssessment.id.length > 0,
  );
  TestValidator.predicate(
    "organization_id is present",
    typeof riskAssessment.organization_id === "string" &&
      riskAssessment.organization_id.length > 0,
  );
  TestValidator.predicate(
    "assessment_type is present",
    typeof riskAssessment.assessment_type === "string" &&
      riskAssessment.assessment_type.length > 0,
  );
  TestValidator.predicate(
    "status is present",
    typeof riskAssessment.status === "string" &&
      riskAssessment.status.length > 0,
  );
  TestValidator.predicate(
    "methodology is present",
    typeof riskAssessment.methodology === "string" &&
      riskAssessment.methodology.length > 0,
  );
  TestValidator.predicate(
    "risk_level is present",
    typeof riskAssessment.risk_level === "string" &&
      riskAssessment.risk_level.length > 0,
  );
}
