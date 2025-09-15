import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test hard deletion of a coding test review comment by its author technical
 * reviewer.
 *
 * This scenario verifies that:
 *
 * 1. A technical reviewer can create and then delete their own review comment
 *    (success).
 * 2. Deleting the same comment a second time fails (already deleted/not found).
 * 3. A different reviewer cannot delete another's comment (authorization failure).
 * 4. Deleting a random non-existent reviewCommentId fails (not found).
 *
 * Steps:
 *
 * 1. Register/Join tech reviewer1; keep id and email
 * 2. Register/Join tech reviewer2
 * 3. Switch to reviewer1 (if not current)
 * 4. Create a review comment as reviewer1 for a random test/submission
 * 5. Delete that comment as reviewer1 (success expected)
 * 6. Try to delete same comment again (should fail)
 * 7. Switch to reviewer2, and try to delete comment (should fail: not author)
 * 8. Try to delete a totally random reviewCommentId (should fail)
 *
 * Edge-cases: Can only test what is exposed: no GET/list/recovery API to
 * confirm visibility or hard/soft state, cannot test admin deletion path.
 */
export async function test_api_review_comment_delete_by_owning_tech_reviewer_soft_delete_logic(
  connection: api.IConnection,
) {
  // 1. Create tech reviewer 1
  const reviewer1Email = typia.random<string & tags.Format<"email">>();
  const reviewer1Password = "TestPass!1234";
  const reviewer1: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewer1Email,
        password: reviewer1Password,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.pick([
          "Backend",
          "Frontend",
          "Mobile",
          "Cloud",
        ] as const),
      },
    });
  typia.assert(reviewer1);

  // 2. Create tech reviewer 2
  const reviewer2Email = typia.random<string & tags.Format<"email">>();
  const reviewer2Password = "TestPass2!5678";
  const reviewer2: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewer2Email,
        password: reviewer2Password,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.pick([
          "Backend",
          "Frontend",
          "Mobile",
          "Cloud",
        ] as const),
      },
    });
  typia.assert(reviewer2);

  // 3. Re-login as reviewer1 to ensure it's the authenticated user
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewer1Email,
      password: reviewer1Password,
      name: reviewer1.name,
      specialization: reviewer1.specialization ?? undefined,
    },
  });

  // 4. Create a review comment as reviewer1
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();
  const commentCreate = {
    ats_recruitment_coding_test_submission_id: submissionId,
    ats_recruitment_techreviewer_id: reviewer1.id,
    comment_text: RandomGenerator.paragraph({ sentences: 4 }),
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
        body: commentCreate,
      },
    );
  typia.assert(comment);
  const reviewCommentId = comment.id;

  // 5. Delete the comment as reviewer1 (should succeed)
  await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.erase(
    connection,
    {
      codingTestId,
      submissionId,
      reviewCommentId,
    },
  );

  // 6. Try to delete again (should fail)
  await TestValidator.error(
    "should not delete already-deleted comment",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.erase(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId,
        },
      );
    },
  );

  // 7. Login as reviewer2, try to delete reviewCommentId (should fail: permission)
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewer2Email,
      password: reviewer2Password,
      name: reviewer2.name,
      specialization: reviewer2.specialization ?? undefined,
    },
  });
  await TestValidator.error(
    "non-author cannot delete other's review comment",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.erase(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId,
        },
      );
    },
  );

  // 8. Attempt to delete a totally random comment ID (should fail)
  await TestValidator.error(
    "deleting non-existent comment id should fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.reviewComments.erase(
        connection,
        {
          codingTestId,
          submissionId,
          reviewCommentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
