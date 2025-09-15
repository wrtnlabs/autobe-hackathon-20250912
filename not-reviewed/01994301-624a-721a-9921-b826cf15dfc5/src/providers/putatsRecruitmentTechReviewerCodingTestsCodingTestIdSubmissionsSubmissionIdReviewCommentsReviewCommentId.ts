import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Update an existing review comment for a coding test submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * Updates the content, type, or audit timestamps of an active coding test
 * review comment. Only the authoring tech reviewer may update their own
 * comment. Updates are versioned and auditable. Attempts to update soft-deleted
 * or non-owned comments will result in an error.
 *
 * @param props - The update operation properties
 * @param props.techReviewer - The authenticated technical reviewer (author)
 * @param props.codingTestId - UUID of the coding test (required for context)
 * @param props.submissionId - UUID of the coding test submission this comment
 *   is attached to
 * @param props.reviewCommentId - UUID of the review comment to update
 * @param props.body - Partial update data (comment_text, comment_type,
 *   commented_at, updated_at)
 * @returns The updated IAtsRecruitmentCodingTestReviewComment object
 * @throws {Error} If the review comment is not found, is already deleted, or
 *   the user is not the author
 */
export async function putatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdReviewCommentsReviewCommentId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  reviewCommentId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestReviewComment.IUpdate;
}): Promise<IAtsRecruitmentCodingTestReviewComment> {
  const { techReviewer, submissionId, reviewCommentId, body } = props;

  // Step 1: Fetch and verify existence/ownership (active / not deleted)
  const comment =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findFirst(
      {
        where: {
          id: reviewCommentId,
          ats_recruitment_coding_test_submission_id: submissionId,
          deleted_at: null,
        },
      },
    );

  if (!comment) {
    throw new Error(
      "Review comment not found, deleted, or does not belong to this submission.",
    );
  }
  if (comment.ats_recruitment_techreviewer_id !== techReviewer.id) {
    throw new Error("You are not authorized to update this review comment.");
  }

  // Step 2: Prepare update (update only allowed fields)
  // Always update updated_at to now if missing
  const actualUpdatedAt = body.updated_at ?? toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.update({
      where: { id: reviewCommentId },
      data: {
        ...(body.comment_text !== undefined && {
          comment_text: body.comment_text,
        }),
        ...(body.comment_type !== undefined && {
          comment_type: body.comment_type,
        }),
        ...(body.commented_at !== undefined && {
          commented_at: body.commented_at,
        }),
        updated_at: actualUpdatedAt,
      },
    });

  // Step 3: Map DB result to DTO (convert all dates to correct format)
  return {
    id: updated.id,
    ats_recruitment_coding_test_submission_id:
      updated.ats_recruitment_coding_test_submission_id,
    ats_recruitment_techreviewer_id: updated.ats_recruitment_techreviewer_id,
    comment_text: updated.comment_text,
    comment_type: updated.comment_type,
    started_at: toISOStringSafe(updated.started_at),
    commented_at: toISOStringSafe(updated.commented_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
