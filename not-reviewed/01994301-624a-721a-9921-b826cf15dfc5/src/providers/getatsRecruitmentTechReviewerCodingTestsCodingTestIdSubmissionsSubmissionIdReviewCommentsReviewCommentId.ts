import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Fetch details of a specific review comment on a coding test submission.
 *
 * This endpoint retrieves all properties of an individual review comment for a
 * specific submission, ensuring strict audit, compliance, and access control.
 * Only the authoring technical reviewer may view this comment, and only if it
 * is not soft-deleted.
 *
 * @param props - Object containing identifiers and authentication:
 * @param props.techReviewer - The authenticated technical reviewer requesting
 *   the comment detail
 * @param props.codingTestId - UUID of the coding test context
 * @param props.submissionId - UUID of the coding test submission context
 * @param props.reviewCommentId - UUID of the review comment to fetch
 * @returns The full review comment details, with all audit and review fields
 *   populated
 * @throws {Error} When comment is not found, soft deleted, does not match
 *   submission/test chain, or user is unauthorized
 */
export async function getatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdReviewCommentsReviewCommentId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  reviewCommentId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestReviewComment> {
  const { techReviewer, codingTestId, submissionId, reviewCommentId } = props;

  // STEP 1: Fetch the review comment by ID (must not be soft deleted)
  const comment =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findFirst(
      {
        where: {
          id: reviewCommentId,
          deleted_at: null,
        },
      },
    );
  if (!comment)
    throw new Error("Review comment not found or has been deleted.");

  // STEP 2: Authorization - only the authoring tech reviewer may access
  if (comment.ats_recruitment_techreviewer_id !== techReviewer.id) {
    throw new Error(
      "Unauthorized: Only the authoring reviewer can access this comment.",
    );
  }

  // STEP 3: Load submission (must exist and be linked to the right coding test)
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findUnique({
      where: { id: submissionId },
    });
  if (
    !submission ||
    submission.ats_recruitment_coding_test_id !== codingTestId
  ) {
    throw new Error(
      "Submission not found, or does not match the provided coding test.",
    );
  }

  // STEP 4: Validate that comment belongs to this submission
  if (comment.ats_recruitment_coding_test_submission_id !== submissionId) {
    throw new Error("Review comment does not belong to the given submission.");
  }

  // STEP 5: Return mapped object with all required fields, date-times as branded strings
  const result: IAtsRecruitmentCodingTestReviewComment = {
    id: comment.id,
    ats_recruitment_coding_test_submission_id:
      comment.ats_recruitment_coding_test_submission_id,
    ats_recruitment_techreviewer_id: comment.ats_recruitment_techreviewer_id,
    comment_text: comment.comment_text,
    comment_type: comment.comment_type,
    started_at: toISOStringSafe(comment.started_at),
    commented_at: toISOStringSafe(comment.commented_at),
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at !== undefined && comment.deleted_at !== null
        ? toISOStringSafe(comment.deleted_at)
        : null,
  };
  return result;
}
