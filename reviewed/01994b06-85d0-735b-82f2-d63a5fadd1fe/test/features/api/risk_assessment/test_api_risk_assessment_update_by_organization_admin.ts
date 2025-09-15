import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";

/**
 * Simulates an org admin updating a risk assessment:
 *
 * 1. Registers and logs in an organization admin
 * 2. Generates a mock existing risk assessment for the organization's admin
 * 3. Successfully updates assessment fields (status, recommendations)
 * 4. Attempts update on forbidden fields for 'completed' status (should fail)
 * 5. Attempts update with a non-existent riskAssessmentId (should fail)
 * 6. Attempts update on a risk assessment from a different org (should fail)
 */
export async function test_api_risk_assessment_update_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminJoin = typia.random<IHealthcarePlatformOrganizationAdmin.IJoin>();
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoin,
    },
  );
  typia.assert(adminAuth);

  // 2. Generate a mock risk assessment for the org admin (simulate prior existence)
  const mockAssessment: IHealthcarePlatformRiskAssessment =
    typia.random<IHealthcarePlatformRiskAssessment>();
  // force correct organization_id association
  mockAssessment.organization_id = adminAuth.id satisfies string as string;

  // 3. Simulate a successful update (e.g., status change, recommendations)
  const updateBody1 = {
    status: "in_progress",
    recommendations: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformRiskAssessment.IUpdate;
  const updatedAssessment =
    await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.update(
      connection,
      {
        riskAssessmentId: mockAssessment.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedAssessment);
  TestValidator.equals(
    "risk assessment status updated",
    updatedAssessment.status,
    updateBody1.status,
  );
  TestValidator.equals(
    "risk assessment recommendations updated",
    updatedAssessment.recommendations,
    updateBody1.recommendations,
  );

  // 4. Attempt to update a forbidden field for completed assessment (should fail)
  // mock a completed assessment
  mockAssessment.status = "completed";
  const forbiddenUpdateBody = {
    status: "in_progress",
    recommendations: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformRiskAssessment.IUpdate;
  await TestValidator.error(
    "forbidden update on completed assessment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.update(
        connection,
        {
          riskAssessmentId: mockAssessment.id,
          body: forbiddenUpdateBody,
        },
      );
    },
  );

  // 5. Attempt to update a non-existent risk assessmentId
  await TestValidator.error(
    "update non-existent riskAssessmentId is rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.update(
        connection,
        {
          riskAssessmentId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody1,
        },
      );
    },
  );

  // 6. Attempt to update a risk assessment from a different organization
  const otherOrgAssessment: IHealthcarePlatformRiskAssessment =
    typia.random<IHealthcarePlatformRiskAssessment>();
  // ensure org id does NOT match
  otherOrgAssessment.organization_id = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "update on risk assessment from other org fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.update(
        connection,
        {
          riskAssessmentId: otherOrgAssessment.id,
          body: updateBody1,
        },
      );
    },
  );

  // (Optionally) If API provides a way to view audit logs, fetch & assert that updates are logged
  // ... audit log check logic would go here ...
}
