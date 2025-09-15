import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for updating an organization compliance review as an
 * organization admin.
 *
 * 1. Onboard and authenticate both a systemAdmin and an organizationAdmin.
 * 2. System admin creates a healthcare organization.
 * 3. Organization admin creates legal hold and risk assessment within the
 *    organization.
 * 4. Organization admin creates a compliance review linked to those dependencies.
 * 5. Organization admin updates the compliance review using valid new details,
 *    validates that the update occurred and that key audit fields match
 *    expectations.
 * 6. Attempt updates as a system admin and confirm permission error occurs.
 * 7. Attempt update with invalid complianceReviewId and confirm error logic.
 * 8. Try updating with deleted risk assessment or legal hold, expect error.
 * 9. Attempt to set reviewer_id to a random UUID (not an org user), expect error.
 * 10. Attempt update omitting required updatable fields, check business logic.
 */
export async function test_api_organization_compliance_review_update_with_validations(
  connection: api.IConnection,
) {
  // STEP 1: Create and authenticate system and organization admin users
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "password123",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "orgpassword1",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // STEP 2: Switch to system admin and create organization
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "password123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // STEP 3: Switch to org admin and create dependencies
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgpassword1",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const legalHold =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          subject_type: "org_data",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          method: "system",
          status: "active",
          effective_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformLegalHold.ICreate,
      },
    );
  typia.assert(legalHold);

  const riskAssessment =
    await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          assessment_type: "annual",
          status: "scheduled",
          methodology: "NIST CSF",
          risk_level: "moderate",
          window_start: new Date().toISOString(),
          window_end: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
        } satisfies IHealthcarePlatformRiskAssessment.ICreate,
      },
    );
  typia.assert(riskAssessment);

  // STEP 4: Create compliance review
  const complianceReview =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          hold_id: legalHold.id,
          risk_assessment_id: riskAssessment.id,
          reviewer_id: orgAdmin.id,
          review_type: "periodic",
          method: "manual audit",
          status: "scheduled",
          comments: "Initial review setup.",
        } satisfies IHealthcarePlatformComplianceReview.ICreate,
      },
    );
  typia.assert(complianceReview);

  // STEP 5: Update compliance review successfully
  const updateBody = {
    reviewer_id: orgAdmin.id,
    review_type: "incident",
    method: "external audit",
    status: "completed",
    outcome: "Passed",
    recommendations: "No action required.",
    reviewed_at: new Date().toISOString(),
    comments: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHealthcarePlatformComplianceReview.IUpdate;
  const updatedReview =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
      connection,
      {
        complianceReviewId: complianceReview.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  TestValidator.equals("updated status", updatedReview.status, "completed");
  TestValidator.equals(
    "reviewer id not changed",
    updatedReview.reviewer_id,
    orgAdmin.id,
  );
  TestValidator.equals(
    "outcome and recommendations match",
    updatedReview.outcome,
    "Passed",
  );
  TestValidator.equals(
    "recommendations match",
    updatedReview.recommendations,
    "No action required.",
  );

  // STEP 6: Switch to system admin, try updating (expect permission error)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "password123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "permission error when non-org-admin attempts update",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: complianceReview.id,
          body: { status: "rejected" },
        },
      );
    },
  );

  // STEP 7: Update with invalid complianceReviewId
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgpassword1",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "invalid complianceReviewId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // STEP 8: Soft delete (simulate by using non-existent) legal hold, try updating hold_id
  await TestValidator.error(
    "cannot update compliance review with deleted or nonexistent legal hold",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: complianceReview.id,
          body: { hold_id: typia.random<string & tags.Format<"uuid">>() },
        },
      );
    },
  );
  // STEP 8: Soft delete risk assessment - simulated with random uuid
  await TestValidator.error(
    "cannot update compliance review with deleted or nonexistent risk assessment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: complianceReview.id,
          body: {
            risk_assessment_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // STEP 9: Assign reviewer_id to random (non-existent) UUID
  await TestValidator.error(
    "cannot set reviewer_id to non-existent user",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: complianceReview.id,
          body: { reviewer_id: typia.random<string & tags.Format<"uuid">>() },
        },
      );
    },
  );

  // STEP 10: Try update omitting all optional fields (should error as at least one field expected)
  await TestValidator.error(
    "update with empty body should error business logic",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.update(
        connection,
        {
          complianceReviewId: complianceReview.id,
          body: {},
        },
      );
    },
  );
}
