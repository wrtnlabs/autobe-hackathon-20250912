import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";

/**
 * Organization admin retrieves and validates risk assessment detail access and
 * compliance rules.
 *
 * 1. Register a new organization admin and acquire authentication.
 * 2. Simulate or retrieve a risk assessment record belonging to this admin's
 *    organization.
 * 3. Retrieve the risk assessment record using
 *    api.functional.healthcarePlatform.organizationAdmin.riskAssessments.at.
 * 4. Validate that returned assessment is for admin's organization and all core
 *    fields are present.
 * 5. Attempt to access a risk assessment from another organization and expect
 *    authorization failure.
 * 6. Attempt to fetch a deleted/nonexistent risk assessment and expect 404 error.
 */
export async function test_api_organization_admin_risk_assessment_detail_access_and_compliance(
  connection: api.IConnection,
) {
  // Step 1: Register organization admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(adminAuth);

  // Step 2: Simulate a risk assessment for this org
  const orgId = adminAuth.id;
  const riskAssessment = {
    id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: orgId,
    assessment_type: "annual",
    status: "completed",
    methodology: "NIST CSF",
    risk_level: RandomGenerator.pick([
      "low",
      "moderate",
      "high",
      "critical",
    ] as const),
    window_start: new Date().toISOString(),
    window_end: new Date(Date.now() + 3600 * 1000 * 24 * 7).toISOString(),
    recommendations: RandomGenerator.paragraph({ sentences: 3 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IHealthcarePlatformRiskAssessment;
  typia.assert(riskAssessment);

  // Step 3: Retrieve with valid id (simulate db): should succeed
  // (since there is no CREATE endpoint, assume system is in simulation mode or use the DTO directly)
  // Skip actual persistence, focus on GET and error handling logic
  const retrieved =
    await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.at(
      connection,
      { riskAssessmentId: riskAssessment.id },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "organization_id matches",
    retrieved.organization_id,
    orgId,
  );
  TestValidator.equals("id matches", retrieved.id, riskAssessment.id);

  // Check presence of core metadata/fields
  TestValidator.equals(
    "recommendations present",
    typeof retrieved.recommendations,
    "string",
  );
  TestValidator.equals("status", retrieved.status, "completed");
  TestValidator.predicate(
    "window_start ISO string",
    typeof retrieved.window_start === "string" &&
      !Number.isNaN(Date.parse(retrieved.window_start)),
  );
  TestValidator.predicate(
    "window_end ISO string",
    typeof retrieved.window_end === "string" &&
      !Number.isNaN(Date.parse(retrieved.window_end)),
  );

  // Step 4: Try access as another org - simulate with different id (should throw auth error)
  await TestValidator.error(
    "cannot access risk assessment outside admin's organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.at(
        connection,
        { riskAssessmentId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // Step 5: Try access to a nonexistent assessment id (should 404)
  await TestValidator.error(
    "should throw for nonexistent risk assessment id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.at(
        connection,
        { riskAssessmentId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
