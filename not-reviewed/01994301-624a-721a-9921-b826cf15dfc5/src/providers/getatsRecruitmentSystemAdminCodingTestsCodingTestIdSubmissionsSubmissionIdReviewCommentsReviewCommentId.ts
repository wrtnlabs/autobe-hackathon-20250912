import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch details of a specific review comment on a coding test submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * Retrieves the full record for one review comment from a coding test
 * submission for audit/compliance/contextual review. Only allowed for active
 * (not soft-deleted) comments and only accessible to system administrators.
 * Ensures three-way linkage among codingTestId, submissionId, and
 * reviewCommentId.
 *
 * @param props - Parameters for the fetch operation
 * @param props.systemAdmin - The authenticated system admin user
 * @param props.codingTestId - The coding test ID that must own the submission
 * @param props.submissionId - The submission's unique ID
 * @param props.reviewCommentId - The specific review comment's unique ID
 * @returns Full review comment detail, including audit properties and only if
 *   not soft-deleted.
 * @throws {Error} If the review comment does not exist, is soft deleted, or is
 *   not linked to the specified submission & coding test.
 */
export async function getatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdReviewCommentsReviewCommentId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  reviewCommentId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestReviewComment> {
  const { codingTestId, submissionId, reviewCommentId } = props;

  // Step 1: Fetch review comment, enforce not soft-deleted
  const reviewComment =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findFirst(
      {
        where: {
          id: reviewCommentId,
          ats_recruitment_coding_test_submission_id: submissionId,
          deleted_at: null,
        },
      },
    );
  if (!reviewComment)
    throw new Error(
      "Review comment not found, soft deleted, or not associated with this submission",
    );

  // Step 2: Ensure the submission also belongs to the correct codingTestId
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
      },
    });
  if (!submission)
    throw new Error(
      "Submission not found or not associated with the specified coding test",
    );

  // Step 3: Return the review comment with all brand conversions applied
  return {
    id: reviewComment.id,
    ats_recruitment_coding_test_submission_id:
      reviewComment.ats_recruitment_coding_test_submission_id,
    ats_recruitment_techreviewer_id:
      reviewComment.ats_recruitment_techreviewer_id,
    comment_text: reviewComment.comment_text,
    comment_type: reviewComment.comment_type,
    started_at: toISOStringSafe(reviewComment.started_at),
    commented_at: toISOStringSafe(reviewComment.commented_at),
    created_at: toISOStringSafe(reviewComment.created_at),
    updated_at: toISOStringSafe(reviewComment.updated_at),
    deleted_at:
      reviewComment.deleted_at === null
        ? null
        : toISOStringSafe(reviewComment.deleted_at),
  };
}
