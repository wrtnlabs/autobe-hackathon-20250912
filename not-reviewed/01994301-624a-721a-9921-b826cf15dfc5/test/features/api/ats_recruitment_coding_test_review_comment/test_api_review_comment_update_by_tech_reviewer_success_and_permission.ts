import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates that a technical reviewer can update one of their own review
 * comments on a coding test submission, enforcing permission and workflow
 * business rules.
 *
 * Test Flow:
 *
 * 1. Tech reviewer 1 joins and authenticates
 * 2. Reviewer 1 creates a review comment for a random submission
 * 3. Reviewer 1 updates their own review comment (should succeed, with updated
 *    audit fields)
 * 4. Reviewer 1 logs out
 * 5. Tech reviewer 2 joins and tries to update reviewer 1's comment (should fail
 *    with permission error)
 * 6. Attempt to update a (simulated) deleted comment (should fail with appropriate
 *    error)
 *
 * Validates correct audit trail, permission boundaries, and business
 * validation.
 */
export async function test_api_review_comment_update_by_tech_reviewer_success_and_permission(
  connection: api.IConnection,
) {
  // 1. Tech reviewer 1 joins and authenticates
  const reviewer1Email: string = typia.random<string & tags.Format<"email">>();
  const reviewer1: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewer1Email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      },
    });
  typia.assert(reviewer1);

  // 2. Reviewer 1 creates a review comment
  const codingTestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const submissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createBody = {
    ats_recruitment_coding_test_submission_id: submissionId,
    ats_recruitment_techreviewer_id: reviewer1.id,
    comment_text: RandomGenerator.paragraph({ sentences: 4 }),
    comment_type: RandomGenerator.pick([
      "manual",
      "auto",
      "plagiarism_flag",
      "system",
    ] as const),
    started_at: new Date(Date.now() - 60 * 1000).toISOString(),
    commented_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestReviewComment.ICreate;

  const reviewComment: IAtsRecruitmentCodingTestReviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId,
        submissionId,
        body: createBody,
      },
    );
  typia.assert(reviewComment);

  // 3. Reviewer 1 updates their own review comment
  const updateBody = {
    comment_text: RandomGenerator.paragraph({ sentences: 6 }),
    comment_type: RandomGenerator.pick([
      "manual",
      "auto",
      "plagiarism_flag",
      "system",
    ] as const),
    commented_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestReviewComment.IUpdate;

  const updated: IAtsRecruitmentCodingTestReviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.update(
      connection,
      {
        codingTestId,
        submissionId,
        reviewCommentId: reviewComment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "updated_at should change on update",
    updated.updated_at,
    reviewComment.updated_at,
  );
  TestValidator.equals(
    "updated comment_text",
    updated.comment_text,
    updateBody.comment_text!,
  );
  TestValidator.equals(
    "updated comment_type",
    updated.comment_type,
    updateBody.comment_type!,
  );
  TestValidator.equals(
    "updated commented_at",
    updated.commented_at,
    updateBody.commented_at!,
  );

  // 4. Reviewer 1 logs out (simulate by overwriting connection headers for unauthenticated state)
  // (Assume connection will be re-authenticated for reviewer 2)
  // 5. Tech reviewer 2 joins and tries to update reviewer 1's comment
  const reviewer2Email: string = typia.random<string & tags.Format<"email">>();
  const reviewer2: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewer2Email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      },
    });
  typia.assert(reviewer2);

  await TestValidator.error(
    "other reviewer cannot update comment they do not own",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.update(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: reviewComment.id,
          body: {
            comment_text: RandomGenerator.paragraph({ sentences: 3 }),
            updated_at: new Date().toISOString(),
          } satisfies IAtsRecruitmentCodingTestReviewComment.IUpdate,
        },
      );
    },
  );

  // 6. Attempt to update a deleted (or random non-existent) comment
  const nonExistentReviewCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "updating a non-existent review comment fails",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.update(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: nonExistentReviewCommentId,
          body: {
            comment_text: "Trying to update deleted/non-existent comment", // Provided sample value
            updated_at: new Date().toISOString(),
          } satisfies IAtsRecruitmentCodingTestReviewComment.IUpdate,
        },
      );
    },
  );
}
