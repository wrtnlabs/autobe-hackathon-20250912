import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Get full detail for a specific coding test submission in AtsRecruitment
 *
 * Retrieves the full details of a particular submission to a coding test,
 * including submission content, validation/review status, reviewer comments,
 * and related test metadata. This operation is accessible to HR recruiters and
 * technical reviewers to facilitate detailed review and feedback tasks. It
 * operates on the ats_recruitment_coding_test_submissions table, returning all
 * structured fields for the requested submission, subjects to access controls
 * per business rules.
 *
 * @param props - Request properties
 * @param props.techReviewer - The authenticated technical reviewer making the
 *   request
 * @param props.codingTestId - Unique identifier of the parent coding test
 * @param props.submissionId - Unique identifier of the coding test submission
 *   to retrieve
 * @returns The detailed coding test submission object, including status,
 *   reviewer comments, and answer info as appropriate
 * @throws {Error} If the coding test submission is not found or is deleted, or
 *   if access is forbidden
 */
export async function getatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestSubmission> {
  const found =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: props.submissionId,
        ats_recruitment_coding_test_id: props.codingTestId,
        deleted_at: null,
      },
    });
  if (!found) {
    throw new Error("Coding test submission not found");
  }
  return {
    id: found.id,
    ats_recruitment_coding_test_id: found.ats_recruitment_coding_test_id,
    ats_recruitment_applicant_id: found.ats_recruitment_applicant_id,
    ats_recruitment_application_id: found.ats_recruitment_application_id,
    submitted_at: toISOStringSafe(found.submitted_at),
    answer_file_url: found.answer_file_url ?? undefined,
    answer_text: found.answer_text ?? undefined,
    status: found.status,
    received_external_at: found.received_external_at
      ? toISOStringSafe(found.received_external_at)
      : undefined,
    review_status: found.review_status,
    reviewed_at: found.reviewed_at
      ? toISOStringSafe(found.reviewed_at)
      : undefined,
    review_comment_summary: found.review_comment_summary ?? undefined,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at
      ? toISOStringSafe(found.deleted_at)
      : undefined,
  };
}
