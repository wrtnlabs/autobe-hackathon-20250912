import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestReviewComment";

/**
 * E2E test: System admin can query (index) coding test review comments
 * securely; unauthorized actors are forbidden.
 *
 * This covers:
 *
 * 1. System admin registers and logs in
 * 2. Applicant registers and logs in
 * 3. System admin creates a review comment for a coding test submission
 * 4. System admin retrieves (index) review comments and validates response
 *    integrity/finding the comment
 * 5. Unauthorized (applicant) actor attempts to access reviewComments.index and
 *    fails authz
 * 6. Search for non-existent review_comment_id returns empty result (cannot test
 *    update/patch as no API exists for it) All business entity and
 *    authentication flows are realistic; negative type-error tests are not
 *    present.
 */
export async function test_api_review_comment_update_by_system_admin_with_dependencies(
  connection: api.IConnection,
) {
  // Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      },
    });
  typia.assert(admin);

  // Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
      },
    });
  typia.assert(applicant);

  // System admin logs in
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // Generate test ids (simulate real submission/coding test)
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();
  const techReviewerId = typia.random<string & tags.Format<"uuid">>();

  // System admin creates a review comment for the submission
  const commentText = RandomGenerator.paragraph({ sentences: 2 });
  const commentType = "manual";
  const reviewComment: IAtsRecruitmentCodingTestReviewComment =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId,
        submissionId,
        body: {
          ats_recruitment_coding_test_submission_id: submissionId,
          ats_recruitment_techreviewer_id: techReviewerId,
          comment_text: commentText,
          comment_type: commentType,
          started_at: new Date().toISOString(),
          commented_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(reviewComment);

  // System admin retrieves the list of comments for this submission, ensures comment is present
  const page: IPageIAtsRecruitmentCodingTestReviewComment =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.index(
      connection,
      {
        codingTestId,
        submissionId,
        body: {
          ats_recruitment_coding_test_submission_id: submissionId,
          ats_recruitment_techreviewer_id: techReviewerId,
        },
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "Created review comment is found in index result",
    page.data.some(
      (c) =>
        c.id === reviewComment.id &&
        c.comment_text === commentText &&
        c.comment_type === commentType,
    ),
  );

  // Applicant (unauthorized) attempts to access index (should fail)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  await TestValidator.error(
    "Applicant (unauthorized) cannot access index endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.index(
        connection,
        {
          codingTestId,
          submissionId,
          body: {},
        },
      );
    },
  );

  // System admin logs in again
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // Search for non-existent review_comment_id returns empty list
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();
  const pageNotFound: IPageIAtsRecruitmentCodingTestReviewComment =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.index(
      connection,
      {
        codingTestId,
        submissionId,
        body: {
          review_comment_id: invalidReviewId,
        },
      },
    );
  typia.assert(pageNotFound);
  TestValidator.equals(
    "Search for invalid review_comment_id returns empty result",
    pageNotFound.data.length,
    0,
  );
}
