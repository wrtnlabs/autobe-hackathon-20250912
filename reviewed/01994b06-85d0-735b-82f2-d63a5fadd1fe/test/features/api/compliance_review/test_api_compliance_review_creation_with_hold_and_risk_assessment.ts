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
 * Validates that a system administrator can create a compliance review when all
 * required dependencies exist, and that errors occur when missing links are
 * omitted or when unauthorized users attempt the operation.
 *
 * 1. Register/join as system admin and authenticate
 * 2. Create an organization (tenant)
 * 3. Create a legal hold for the organization
 * 4. Create a risk assessment for the organization
 * 5. (Reviewer admin): Use the system admin from step 1 as reviewer
 * 6. Create the compliance review, linking org, legal hold, risk assessment,
 *    reviewer
 * 7. Validate correct linkage and audit/trail created
 * 8. Attempt compliance review creation omitting each required reference (hold,
 *    risk_assessment, reviewer) and validate business errors
 * 9. Attempt compliance review creation without system admin auth and expect
 *    failure
 */
export async function test_api_compliance_review_creation_with_hold_and_risk_assessment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminJoinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinReq,
    });
  typia.assert(admin);
  // Auth token is set automatically on connection

  // 2. Create healthcare organization
  const orgReq = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgReq },
    );
  typia.assert(organization);

  // 3. Create legal hold for org
  const legalHoldReq = {
    organization_id: organization.id,
    subject_type: "org_data",
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  const legalHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      { body: legalHoldReq },
    );
  typia.assert(legalHold);

  // 4. Create risk assessment for org
  const now = new Date();
  const window_start = new Date(
    now.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const window_end = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const riskAssessmentReq = {
    organization_id: organization.id,
    assessment_type: "annual",
    status: "completed",
    methodology: "NIST CSF",
    risk_level: "moderate",
    window_start,
    window_end,
  } satisfies IHealthcarePlatformRiskAssessment.ICreate;
  const riskAssessment =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.create(
      connection,
      { body: riskAssessmentReq },
    );
  typia.assert(riskAssessment);

  // 5. Reviewer is system admin we created (admin.id)
  const reviewer_id = admin.id;

  // 6. Create compliance review with all refs
  const complianceReviewReq = {
    organization_id: organization.id,
    hold_id: legalHold.id,
    risk_assessment_id: riskAssessment.id,
    reviewer_id,
    review_type: "periodic",
    method: "manual audit",
    status: "scheduled",
    outcome: "Initial assessment scheduled.",
    recommendations: "Proceed with annual review.",
    reviewed_at: null,
    comments: "Test created by E2E.",
  } satisfies IHealthcarePlatformComplianceReview.ICreate;
  const complianceReview =
    await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
      connection,
      { body: complianceReviewReq },
    );
  typia.assert(complianceReview);
  // Validate linkages
  TestValidator.equals(
    "review organization linkage",
    complianceReview.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "review legal hold linkage",
    complianceReview.hold_id,
    legalHold.id,
  );
  TestValidator.equals(
    "review risk assessment linkage",
    complianceReview.risk_assessment_id,
    riskAssessment.id,
  );
  TestValidator.equals(
    "review reviewer linkage",
    complianceReview.reviewer_id,
    reviewer_id,
  );
  TestValidator.equals(
    "review review_type",
    complianceReview.review_type,
    complianceReviewReq.review_type,
  );
  TestValidator.equals(
    "review status",
    complianceReview.status,
    complianceReviewReq.status,
  );
  TestValidator.equals(
    "review comments",
    complianceReview.comments,
    complianceReviewReq.comments,
  );

  // 7. Attempt to create compliance review with missing legal hold (should fail)
  const reqMissingHold = { ...complianceReviewReq, hold_id: undefined };
  await TestValidator.error(
    "compliance review creation without legal hold should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        connection,
        { body: reqMissingHold },
      );
    },
  );

  // 8. Attempt to create compliance review with missing risk assessment (should fail)
  const reqMissingRisk = {
    ...complianceReviewReq,
    risk_assessment_id: undefined,
  };
  await TestValidator.error(
    "compliance review creation without risk assessment should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        connection,
        { body: reqMissingRisk },
      );
    },
  );

  // 9. Attempt to create compliance review with missing reviewer (should fail)
  const reqMissingReviewer = { ...complianceReviewReq, reviewer_id: undefined };
  await TestValidator.error(
    "compliance review creation without reviewer should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        connection,
        { body: reqMissingReviewer },
      );
    },
  );

  // 10. Attempt to create compliance review without admin auth (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "compliance review creation without admin auth should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceReviews.create(
        unauthConn,
        { body: complianceReviewReq },
      );
    },
  );
}
