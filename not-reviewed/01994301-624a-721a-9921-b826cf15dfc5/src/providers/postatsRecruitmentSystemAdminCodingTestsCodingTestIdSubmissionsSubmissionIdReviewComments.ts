import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new review comment for a submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * This endpoint allows a system administrator to create a review comment for a
 * coding test submission. The function validates coding test and submission
 * existence, business linkage, and business rules. Returns the newly created
 * review comment with audit fields. All date values are handled as ISO strings
 * and only allowed roles (systemAdmin) can invoke this logic.
 *
 * @param props - Required parameters for the review comment creation
 * @param props.systemAdmin - The authenticated system administrator issuing the
 *   review comment
 * @param props.codingTestId - The ID of the target coding test
 * @param props.submissionId - The ID of the submission being commented on
 * @param props.body - The request body containing all required comment fields
 * @returns The created review comment record with audit fields
 * @throws {Error} If referenced coding test or submission does not exist or is
 *   deleted
 * @throws {Error} If the submission does not belong to the coding test
 * @throws {Error} If the comment_text is empty
 */
export async function postatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdReviewComments(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestReviewComment.ICreate;
}): Promise<IAtsRecruitmentCodingTestReviewComment> {
  const { systemAdmin, codingTestId, submissionId, body } = props;

  // Validate coding test existence and soft-deletion
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: { id: codingTestId, deleted_at: null },
    });
  if (codingTest === null) {
    throw new Error("Coding test does not exist or is deleted");
  }

  // Validate submission existence and soft-deletion
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: { id: submissionId, deleted_at: null },
    });
  if (submission === null) {
    throw new Error("Submission does not exist or is deleted");
  }

  // Check that submission belongs to the coding test
  if (submission.ats_recruitment_coding_test_id !== codingTestId) {
    throw new Error("Submission does not belong to the specified coding test");
  }

  // Validate non-empty comment_text
  if (
    typeof body.comment_text !== "string" ||
    body.comment_text.trim().length === 0
  ) {
    throw new Error("comment_text must not be empty");
  }

  // Prepare ISO8601 string for now
  const now = toISOStringSafe(new Date());

  // Generate a UUID for the new review comment without type assertion
  const generatedId = v4();

  // Create the review comment
  const created =
    await MyGlobal.prisma.ats_recruitment_coding_test_review_comments.create({
      data: {
        id: generatedId,
        ats_recruitment_coding_test_submission_id: submissionId,
        ats_recruitment_techreviewer_id: systemAdmin.id,
        comment_text: body.comment_text,
        comment_type: body.comment_type,
        started_at: toISOStringSafe(body.started_at),
        commented_at: toISOStringSafe(body.commented_at),
        created_at: now,
        updated_at: now,
        // deleted_at intentionally not set (remains undefined)
      },
    });

  return {
    id: created.id,
    ats_recruitment_coding_test_submission_id:
      created.ats_recruitment_coding_test_submission_id,
    ats_recruitment_techreviewer_id: created.ats_recruitment_techreviewer_id,
    comment_text: created.comment_text,
    comment_type: created.comment_type,
    started_at: toISOStringSafe(created.started_at),
    commented_at: toISOStringSafe(created.commented_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
