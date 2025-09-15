import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system admin can escalate and permanently delete any review
 * comment, even those authored by other technical reviewers. This includes
 * verifying error handling for re-deletion and non-existent IDs, and that hard
 * delete removes the entity.
 *
 * Test flow:
 *
 * 1. Register system admin; authenticate as admin.
 * 2. Register tech reviewer; authenticate as tech reviewer.
 * 3. Tech reviewer creates a review comment for a coding test submission.
 * 4. Switch to system admin.
 * 5. System admin deletes the review comment by escalation.
 * 6. Admin attempts to delete again (should error as already deleted).
 * 7. Admin attempts to delete a non-existent review comment (should error).
 * 8. Attempt to access (load) the deleted comment (should be not found/removed).
 */
export async function test_api_review_comment_delete_by_system_admin_escalation(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(admin);

  // 2. Register tech reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewerEmail,
        password: reviewerPassword,
        name: RandomGenerator.name(),
        specialization: null,
      },
    });
  typia.assert(techReviewer);

  // 3. Reviewer creates a review comment
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();
  // Ensure we are logged in as reviewer
  await api.functional.auth.techReviewer.login(connection, {
    body: { email: reviewerEmail, password: reviewerPassword },
  });
  const commentCreateBody = {
    ats_recruitment_coding_test_submission_id: submissionId,
    ats_recruitment_techreviewer_id: techReviewer.id,
    comment_text: RandomGenerator.content({ paragraphs: 1 }),
    comment_type: "manual",
    started_at: new Date().toISOString(),
    commented_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestReviewComment.ICreate;
  const comment: IAtsRecruitmentCodingTestReviewComment =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.create(
      connection,
      {
        codingTestId,
        submissionId,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 4. Switch to system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: { email: adminEmail, password: adminPassword },
  });

  // 5. Admin deletes the review comment
  await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.erase(
    connection,
    {
      codingTestId,
      submissionId,
      reviewCommentId: comment.id,
    },
  );

  // 6. Try to delete same comment again (should error)
  await TestValidator.error(
    "cannot delete already deleted comment",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.erase(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: comment.id,
        },
      );
    },
  );

  // 7. Attempt to delete a non-existent review comment (random UUID)
  await TestValidator.error(
    "cannot delete non-existent review comment",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.reviewComments.erase(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. (Optional) Try to access the deleted comment (should be not found/removed error)
  // (No GET API exists in provided functions for a single review comment, so skip this as not implementable)
}
