import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Create a new review comment for a submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * This endpoint allows an authenticated technical reviewer to create a new
 * review comment on a specific coding test submission. The function validates
 * reviewer and submission status, enforces author match, and checks input
 * requirements. Timestamps are handled as branded date-time strings, and only
 * active, legitimate submissions and reviewers are allowed to create comments.
 * Returns the newly created review comment with complete audit fields.
 *
 * @param props - Properties for the operation
 * @param props.techReviewer - The authenticated technical reviewer payload
 * @param props.codingTestId - The UUID of the coding test for which this
 *   comment is being added
 * @param props.submissionId - The UUID of the submission to which this review
 *   applies
 * @param props.body - The review comment creation payload (must reference the
 *   submission and reviewer, contain non-empty comment, specify type and
 *   times)
 * @returns The newly created review comment, including all audit and business
 *   fields
 * @throws {Error} If the reviewer is inactive, submission not found, or any
 *   authorization or validation rules are violated
 */
export async function postatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdReviewComments(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestReviewComment.ICreate;
}): Promise<IAtsRecruitmentCodingTestReviewComment> {
  const { techReviewer, codingTestId, submissionId, body } = props;

  // Authorization: reviewer must be active and present
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
      where: { id: techReviewer.id, deleted_at: null, is_active: true },
    });
  if (!reviewer) {
    throw new Error(
      "Unauthorized. Tech reviewer is not active or does not exist.",
    );
  }

  // Validate submission existence and parent linkage
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
        deleted_at: null,
      },
    });
  if (!submission) {
    throw new Error("Submission not found or already deleted.");
  }

  // Must author as self
  if (body.ats_recruitment_techreviewer_id !== techReviewer.id) {
    throw new Error("You may only create comments as yourself.");
  }

  // Input validation
  if (!body.comment_text.trim()) {
    throw new Error("Comment text must not be empty.");
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.create({
      data: {
        id: v4(),
        ats_recruitment_coding_test_submission_id: submissionId,
        ats_recruitment_techreviewer_id: techReviewer.id,
        comment_text: body.comment_text,
        comment_type: body.comment_type,
        started_at: body.started_at,
        commented_at: body.commented_at,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });

  return {
    id: created.id,
    ats_recruitment_coding_test_submission_id:
      created.ats_recruitment_coding_test_submission_id,
    ats_recruitment_techreviewer_id: created.ats_recruitment_techreviewer_id,
    comment_text: created.comment_text,
    comment_type: created.comment_type,
    started_at: created.started_at,
    commented_at: created.commented_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
