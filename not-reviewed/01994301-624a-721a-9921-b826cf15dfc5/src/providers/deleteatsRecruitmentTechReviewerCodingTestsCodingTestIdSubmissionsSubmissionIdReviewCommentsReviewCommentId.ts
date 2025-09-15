import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Permanently deletes a code review comment from a coding test submission.
 *
 * This operation allows the authoring technical reviewer to irreversibly remove
 * their feedback comment corresponding to the given coding test and submission.
 * Strict permission checks are enforced: only the original author can delete
 * their own comments (admin override not supported here). Attempts to delete
 * already-deleted or non-existent comments always fail with an error, as do
 * attempts where test/submission ID binding do not match. Audit logging is
 * managed externally; deletion here is hard and unrecoverable.
 *
 * @param props - Object containing deletion context
 * @param props.techReviewer - Authenticated technical reviewer
 * @param props.codingTestId - Coding test UUID to validate context
 * @param props.submissionId - Submission UUID to validate association
 * @param props.reviewCommentId - Review comment UUID to be deleted
 * @returns Void
 * @throws {Error} If the comment does not exist, is already deleted, is not
 *   authored by the tech reviewer, or IDs are mismatched
 */
export async function deleteatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdReviewCommentsReviewCommentId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  reviewCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { techReviewer, codingTestId, submissionId, reviewCommentId } = props;

  // 1. Lookup review comment
  const comment =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findFirst(
      {
        where: { id: reviewCommentId },
        select: {
          id: true,
          ats_recruitment_coding_test_submission_id: true,
          ats_recruitment_techreviewer_id: true,
          deleted_at: true,
        },
      },
    );
  if (!comment || comment.deleted_at !== null)
    throw new Error("Review comment not found or already deleted");

  // 2. Auth: must be original author
  if (comment.ats_recruitment_techreviewer_id !== techReviewer.id)
    throw new Error(
      "Unauthorized: Only the authoring tech reviewer may delete this comment",
    );

  // 3. Submission context check
  if (comment.ats_recruitment_coding_test_submission_id !== submissionId)
    throw new Error("Mismatched submission for comment");

  // 4. Verify codingTestId association
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: { id: comment.ats_recruitment_coding_test_submission_id },
      select: { ats_recruitment_coding_test_id: true },
    });
  if (!submission || submission.ats_recruitment_coding_test_id !== codingTestId)
    throw new Error("Mismatched coding test context");

  // 5. Hard delete (irrecoverable)
  await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.delete({
    where: { id: reviewCommentId },
  });
}
