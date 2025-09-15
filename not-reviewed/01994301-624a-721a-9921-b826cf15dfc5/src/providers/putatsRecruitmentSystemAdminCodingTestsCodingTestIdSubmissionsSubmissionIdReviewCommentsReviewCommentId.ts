import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing review comment for a coding test submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * This endpoint allows a system administrator to update an active review
 * comment for a coding test submission. The operation validates the comment's
 * existence, ensures it is not soft-deleted, and enforces auditing on all
 * updates. Only fields provided in the payload (comment_text, comment_type,
 * commented_at) are updated. The 'updated_at' field is always set to the
 * current time. Attempts to update a deleted comment, pass empty comment_text,
 * or submit no updatable fields will result in validation errors. All updates
 * are returned with complete audit information.
 *
 * @param props - Properties for updating a coding test review comment
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update
 * @param props.codingTestId - The coding test id (context parameter)
 * @param props.submissionId - The associated coding test submission id
 * @param props.reviewCommentId - The ID of the review comment to update
 * @param props.body - Update payload; only provided fields will be modified
 * @returns The updated review comment with current values and all audit details
 * @throws {Error} If the review comment does not exist, is deleted, all fields
 *   are missing, or comment_text is empty
 */
export async function putatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdReviewCommentsReviewCommentId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  reviewCommentId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestReviewComment.IUpdate;
}): Promise<IAtsRecruitmentCodingTestReviewComment> {
  const { submissionId, reviewCommentId, body } = props;

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
    throw new Error("Review comment not found or has been deleted.");
  }

  // Validate at least one updatable field is present
  const hasAnyUpdate =
    body.comment_text !== undefined ||
    body.comment_type !== undefined ||
    body.commented_at !== undefined;

  if (!hasAnyUpdate) {
    throw new Error(
      "At least one updatable field must be provided (comment_text, comment_type, commented_at).",
    );
  }

  // Explicit empty string for comment_text is not allowed
  if (
    body.comment_text !== undefined &&
    (typeof body.comment_text !== "string" || body.comment_text.trim() === "")
  ) {
    throw new Error("comment_text, if provided, must be a non-empty string.");
  }

  // Build update data, always update updated_at
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.comment_text !== undefined)
    updateData.comment_text = body.comment_text;
  if (body.comment_type !== undefined)
    updateData.comment_type = body.comment_type;
  if (body.commented_at !== undefined)
    updateData.commented_at = body.commented_at;

  const updated =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.update({
      where: { id: reviewCommentId },
      data: updateData,
    });

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
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
