import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test system admin's ability to update coding test review comments regardless
 * of author, with coverage on audit logic and business rule validation.
 *
 * Steps:
 *
 * 1. Register and authenticate a system admin account (admin has super_admin
 *    privilege)
 * 2. Register and authenticate a tech reviewer account
 * 3. Tech reviewer creates a new review comment on a random (simulated) coding
 *    test submission
 * 4. System admin updates the review comment - modifies comment_text and
 *    comment_type, sets new commented_at
 * 5. Retrieve and verify the updated comment has new values, timestamps are
 *    updated
 * 6. Soft-delete the comment by simulating a deleted_at timestamp (no actual API,
 *    so skip real deletion if endpoint doesn't exist)
 * 7. Attempt to update with reviewCommentId that is deleted (simulate or skip if
 *    no soft-delete API)
 * 8. Attempt to update with empty comment_text (should fail validation)
 * 9. Attempt to update with no body fields (should fail)
 */
export async function test_api_review_comment_update_by_system_admin_permission(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Register tech reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const reviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewerEmail,
        password: reviewerPassword,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(reviewer);

  // Step 3: Reviewer creates a comment
  // Simulate codingTestId/submissionId
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  const now = new Date();
  const createBody = {
    ats_recruitment_coding_test_submission_id: submissionId,
    ats_recruitment_techreviewer_id: reviewer.id,
    comment_text: RandomGenerator.paragraph({ sentences: 5 }),
    comment_type: RandomGenerator.pick([
      "manual",
      "auto",
      "system",
      "plagiarism_flag",
    ] as const),
    started_at: now.toISOString(),
    commented_at: now.toISOString(),
  } satisfies IAtsRecruitmentCodingTestReviewComment.ICreate;
  const reviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId,
        submissionId,
        body: createBody,
      },
    );
  typia.assert(reviewComment);

  // Step 4: Admin login, update the comment
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  const newText = RandomGenerator.paragraph({ sentences: 8 });
  const newType = RandomGenerator.pick([
    "manual",
    "auto",
    "plagiarism_flag",
  ] as const);
  const updateBody = {
    comment_text: newText,
    comment_type: newType,
    commented_at: new Date(Date.now() + 60 * 1000).toISOString(),
  } satisfies IAtsRecruitmentCodingTestReviewComment.IUpdate;
  const updated =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.update(
      connection,
      {
        codingTestId,
        submissionId,
        reviewCommentId: reviewComment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated comment text matches",
    updated.comment_text,
    newText,
  );
  TestValidator.equals(
    "updated comment type matches",
    updated.comment_type,
    newType,
  );
  TestValidator.equals(
    "updated comment id unchanged",
    updated.id,
    reviewComment.id,
  );
  TestValidator.notEquals(
    "comment updated_at was changed",
    updated.updated_at,
    reviewComment.updated_at,
  );
  TestValidator.equals(
    "audit trail, author unchanged",
    updated.ats_recruitment_techreviewer_id,
    reviewer.id,
  );

  // Step 5: Update deleted comment - simulate (skip if no deletion endpoint)
  // There's no API to delete, so simulate by calling update with a random non-existent id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent/deleted review comment fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.update(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );

  // Step 6: Attempt empty comment_text (should fail)
  await TestValidator.error(
    "update with empty comment_text should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.update(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: reviewComment.id,
          body: {
            comment_text: "",
          },
        },
      );
    },
  );

  // Step 7: Attempt to update with no fields (should fail)
  await TestValidator.error("update with no fields should fail", async () => {
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.update(
      connection,
      {
        codingTestId,
        submissionId,
        reviewCommentId: reviewComment.id,
        body: {},
      },
    );
  });
}
