import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestReviewComment";

export async function test_api_review_comment_update_by_tech_reviewer_with_dependencies(
  connection: api.IConnection,
) {
  /**
   * Assess the workflow for updating a coding test submission's review comment
   * by a technical reviewer, including dependencies.
   *
   * This test covers:
   *
   * 1. Technical reviewer account creation and authentication
   * 2. Applicant account creation
   * 3. Mock codingTestId/submissionId generation (no create API available)
   * 4. Review comment creation by tech reviewer
   * 5. Simulated review comment update via index/search with patched filter fields
   * 6. Attempt by unauthorized reviewer (should fail)
   * 7. Negative test for invalid review_comment_id (should fail)
   * 8. Audit field/response integrity checks
   *
   * Not covered: Type error or required-field validation via forbidden
   * type-unsafe code (per test guidelines).
   */

  // 1. Provision and authenticate a technical reviewer account
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.pick([
        "Backend",
        "Frontend",
        "DevOps",
        "Data Science",
      ] as const),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 2. Create an applicant account and authenticate
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Mock codingTestId and submissionId (since there is no create endpoint for codingTests or submissions available)
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Reviewer logs in for authoring review comment
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 5. Reviewer creates an initial review comment
  const now = new Date();
  const startedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const commentedAt = now.toISOString();
  const createCommentBody = {
    ats_recruitment_coding_test_submission_id: submissionId,
    ats_recruitment_techreviewer_id: techReviewer.id,
    comment_text: RandomGenerator.paragraph({ sentences: 4 }),
    comment_type: RandomGenerator.pick(["manual", "plagiarism_flag"] as const),
    started_at: startedAt,
    commented_at: commentedAt,
  } satisfies IAtsRecruitmentCodingTestReviewComment.ICreate;
  const reviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId,
        submissionId,
        body: createCommentBody,
      },
    );
  typia.assert(reviewComment);
  TestValidator.equals(
    "review comment author matches reviewer",
    reviewComment.ats_recruitment_techreviewer_id,
    techReviewer.id,
  );
  TestValidator.equals(
    "review comment submission matches",
    reviewComment.ats_recruitment_coding_test_submission_id,
    submissionId,
  );

  // 6. Simulate update: use index/search for PATCH scenario by searching for the specific comment (since no explicit PATCH endpoint exists)
  const updatedCommentType = RandomGenerator.pick([
    "manual",
    "plagiarism_flag",
  ] as const);
  const page =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.index(
      connection,
      {
        codingTestId,
        submissionId,
        body: {
          review_comment_id: reviewComment.id,
          ats_recruitment_coding_test_submission_id: submissionId,
          ats_recruitment_techreviewer_id: techReviewer.id,
          comment_type: updatedCommentType,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page);
  const found = page.data.find((c) => c.id === reviewComment.id);
  typia.assertGuard(found!);

  // 7. Negative test: unauthorized reviewer should NOT be able to search another's comments
  // Create another reviewer and attempt as that reviewer
  const otherReviewerEmail = typia.random<string & tags.Format<"email">>();
  const otherReviewerPassword = RandomGenerator.alphaNumeric(12);
  const otherReviewer = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: otherReviewerEmail,
        password: otherReviewerPassword,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.pick(["Security", "QA"] as const),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    },
  );
  typia.assert(otherReviewer);
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: otherReviewerEmail,
      password: otherReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  await TestValidator.error(
    "unauthorized reviewer cannot update or fetch other's review comment",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.index(
        connection,
        {
          codingTestId,
          submissionId,
          body: {
            review_comment_id: reviewComment.id,
            ats_recruitment_techreviewer_id: otherReviewer.id,
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );

  // 8. Negative test: update/search with invalid comment_id (not found)
  await TestValidator.error(
    "invalid review_comment_id should fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.index(
        connection,
        {
          codingTestId,
          submissionId,
          body: {
            review_comment_id: typia.random<string & tags.Format<"uuid">>(),
            ats_recruitment_techreviewer_id: techReviewer.id,
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );

  // 9. Audit/compliance: deleted_at and timestamps
  TestValidator.equals(
    "deleted_at should be null for active comment",
    found.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is less than or equal to updated_at",
    new Date(found.created_at) <= new Date(found.updated_at),
  );
}
