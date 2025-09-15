import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently deletes a code review comment entry
 * (ats_recruitment_coding_test_review_comments table) for a specific coding
 * test submission.
 *
 * This operation performs a direct (hard) delete of a review comment identified
 * by `reviewCommentId`, ensuring the comment belongs to the specified
 * submission (`submissionId`) and optionally the correct coding test
 * (`codingTestId`). Only system administrators may perform this action. On
 * error (nonexistent comment, mismatched relation), an appropriate exception is
 * thrown.
 *
 * @param props - Arguments required for deletion operation.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   this action.
 * @param props.codingTestId - ID of the coding test to which the comment
 *   belongs.
 * @param props.submissionId - ID of the code test submission for which the
 *   review comment was written.
 * @param props.reviewCommentId - The ID of the specific code review comment to
 *   delete.
 * @returns Void
 * @throws {Error} If the comment does not exist, or its submission/codingTest
 *   linkage does not match the specified IDs.
 */
export async function deleteatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdReviewCommentsReviewCommentId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  reviewCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { codingTestId, submissionId, reviewCommentId } = props;

  // 1. Fetch the review comment
  const comment =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findUnique(
      {
        where: { id: reviewCommentId },
      },
    );
  if (!comment) {
    throw new Error("Review comment not found");
  }

  // 2. Check that the review comment is linked to the specified submission
  if (comment.ats_recruitment_coding_test_submission_id !== submissionId) {
    throw new Error(
      "Review comment does not belong to the specified submission",
    );
  }

  // 3. Optional secondary verification:
  // To enforce the path constraint of codingTestId, join submission table
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findUnique({
      where: { id: submissionId },
    });
  if (!submission) {
    throw new Error("Submission not found");
  }
  if (submission.ats_recruitment_coding_test_id !== codingTestId) {
    throw new Error("Submission does not belong to the specified coding test");
  }

  // 4. Hard delete the review comment
  await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.delete({
    where: { id: reviewCommentId },
  });
}
