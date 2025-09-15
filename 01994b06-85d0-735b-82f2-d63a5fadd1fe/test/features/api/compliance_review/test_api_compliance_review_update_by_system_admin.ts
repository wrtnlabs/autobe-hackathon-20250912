import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the update of an existing compliance review by system admin.
 *
 * Steps:
 *
 * 1. Authenticate as system admin
 * 2. Create organization
 * 3. Create legal hold referencing the organization
 * 4. Create risk assessment referencing the organization
 * 5. Create compliance review referencing org, hold, risk assessment
 * 6. Update compliance review (change reviewer/status/comments etc.)
 * 7. Validate audit trail is updated and properties reflect change
 * 8. Attempt update with random invalid complianceReviewId and expect error
 * 9. Attempt update by unauthorized role (not implemented: only system admin join
 *    is available)
 */
export async function test_api_compliance_review_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin join
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Create organization
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);
  // 3. Create legal hold for org
  const legalHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      {
        body: {
          organization_id: org.id,
          subject_type: "org_data",
          reason: RandomGenerator.paragraph(),
          method: "system",
          status: "active",
          effective_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformLegalHold.ICreate,
      },
    );
  typia.assert(legalHold);
  // 4. Create risk assessment for org
  const riskAssessment =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.create(
      connection,
      {
        body: {
          organization_id: org.id,
          assessment_type: "annual",
          status: "in_progress",
          methodology: "HIPAA",
          risk_level: "moderate",
          window_start: new Date(Date.now() - 86400000).toISOString(), // yesterday
          window_end: new Date().toISOString(),
        } satisfies IHealthcarePlatformRiskAssessment.ICreate,
      },
    );
  typia.assert(riskAssessment);
  // 5. Create compliance review referencing org, legalHold, riskAssessment
  const complianceReview =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      {
        body: {
          organization_id: org.id,
          hold_id: legalHold.id,
          risk_assessment_id: riskAssessment.id,
          review_type: "periodic",
          method: "manual audit",
          status: "scheduled",
          reviewer_id: adminJoin.id,
        } satisfies IHealthcarePlatformComplianceReview.ICreate,
      },
    );
  typia.assert(complianceReview);
  // 6. Update compliance review (set status, reviewer, outcome, recommendations, add comments)
  const updateBody = {
    status: "completed",
    reviewer_id: adminJoin.id,
    outcome: RandomGenerator.paragraph(),
    recommendations: RandomGenerator.paragraph(),
    reviewed_at: new Date().toISOString(),
    comments: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformComplianceReview.IUpdate;
  const updatedReview =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.update(
      connection,
      {
        complianceReviewId: complianceReview.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  TestValidator.notEquals(
    "updated_at changed",
    complianceReview.updated_at,
    updatedReview.updated_at,
  );
  TestValidator.equals(
    "reviewer_id updated",
    updatedReview.reviewer_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "status updated",
    updatedReview.status,
    updateBody.status,
  );
  TestValidator.equals(
    "outcome updated",
    updatedReview.outcome,
    updateBody.outcome,
  );
  TestValidator.equals(
    "recommendations updated",
    updatedReview.recommendations,
    updateBody.recommendations,
  );
  TestValidator.equals(
    "comments updated",
    updatedReview.comments,
    updateBody.comments,
  );
  // 7. Error: random (invalid) complianceReviewId
  await TestValidator.error(
    "update with invalid complianceReviewId should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
  // 8. Type error/missing fields scenario not implemented (absolute prohibition)
}
