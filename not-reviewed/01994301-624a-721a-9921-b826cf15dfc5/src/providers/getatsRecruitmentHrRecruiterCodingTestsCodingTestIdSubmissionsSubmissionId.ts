import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Get full detail for a specific coding test submission in AtsRecruitment
 *
 * Retrieves the full details of a particular submission to a coding test,
 * including submission content, validation/review status, reviewer comments,
 * and related test metadata. This operation is accessible to HR recruiters to
 * facilitate detailed review and feedback tasks. The submission must belong to
 * a coding test owned by the requesting HR recruiter. All date fields are
 * returned as ISO 8601 UTC strings. All access is strictly authorized and no
 * Date types or type assertions are used in the implementation.
 *
 * @param props - Object containing all parameters for the request
 * @param props.hrRecruiter - Authenticated HR recruiter (payload, JWT validated
 *   and not soft-deleted)
 * @param props.codingTestId - Unique identifier for the target coding test
 *   (UUID)
 * @param props.submissionId - Unique identifier for the coding test submission
 *   (UUID)
 * @returns The complete detail of the coding test submission, with all required
 *   and optional fields populated per access authorization rules.
 * @throws {Error} When the coding test does not exist, the recruiter is
 *   unauthorized, or the submission is not found/linked to the coding test.
 */
export async function getatsRecruitmentHrRecruiterCodingTestsCodingTestIdSubmissionsSubmissionId(props: {
  hrRecruiter: HrrecruiterPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTestSubmission> {
  const { hrRecruiter, codingTestId, submissionId } = props;

  // Validate coding test: only allow HR recruiter to access their own, active coding tests
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        ats_recruitment_hrrecruiter_id: hrRecruiter.id,
        deleted_at: null,
      },
    });
  if (!codingTest)
    throw new Error(
      "Coding test not found or you are not authorized to view it.",
    );

  // Fetch the coding test submission for the given coding test
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
      },
    });
  if (!submission) throw new Error("Submission not found.");

  return {
    id: submission.id,
    ats_recruitment_coding_test_id: submission.ats_recruitment_coding_test_id,
    ats_recruitment_applicant_id: submission.ats_recruitment_applicant_id,
    ats_recruitment_application_id: submission.ats_recruitment_application_id,
    submitted_at: toISOStringSafe(submission.submitted_at),
    answer_file_url:
      submission.answer_file_url === null
        ? undefined
        : submission.answer_file_url,
    answer_text:
      submission.answer_text === null ? undefined : submission.answer_text,
    status: submission.status,
    received_external_at:
      submission.received_external_at === null
        ? undefined
        : toISOStringSafe(submission.received_external_at),
    review_status: submission.review_status,
    reviewed_at:
      submission.reviewed_at === null
        ? undefined
        : toISOStringSafe(submission.reviewed_at),
    review_comment_summary:
      submission.review_comment_summary === null
        ? undefined
        : submission.review_comment_summary,
    created_at: toISOStringSafe(submission.created_at),
    updated_at: toISOStringSafe(submission.updated_at),
    deleted_at:
      submission.deleted_at === null
        ? undefined
        : toISOStringSafe(submission.deleted_at),
  };
}
