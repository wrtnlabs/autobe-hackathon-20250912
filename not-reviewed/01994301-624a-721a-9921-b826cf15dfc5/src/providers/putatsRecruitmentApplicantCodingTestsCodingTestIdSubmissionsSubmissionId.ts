import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Update an existing code test submission
 * (ats_recruitment_coding_test_submissions table) before review.
 *
 * This API allows an applicant to edit their own coding test submission for a
 * specific coding test and submission record. Permitted updates include answer
 * file URL, answer text, review status, external receipt timestamp, review
 * completion, and summary comment. Restricted to the original applicant and
 * only allowed before the submission enters the review phase ('review_status'
 * not 'reviewed' or 'locked').
 *
 * @param props - Request properties for the update operation
 * @param props.applicant - The authenticated applicant updating the submission
 * @param props.codingTestId - UUID of the coding test to which the submission
 *   belongs
 * @param props.submissionId - UUID of the submission record to update
 * @param props.body - Partial update data for the submission fields
 * @returns The updated coding test submission in API contract structure
 * @throws {Error} When submission does not exist, is not owned by applicant, is
 *   soft-deleted, or cannot be modified due to review.
 */
export async function putatsRecruitmentApplicantCodingTestsCodingTestIdSubmissionsSubmissionId(props: {
  applicant: ApplicantPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestSubmission.IUpdate;
}): Promise<IAtsRecruitmentCodingTestSubmission> {
  const { applicant, codingTestId, submissionId, body } = props;
  // 1. Fetch the existing submission (with soft delete and ownership check)
  const record =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
        deleted_at: null,
      },
    });
  if (!record) throw new Error("Submission not found");
  if (record.ats_recruitment_applicant_id !== applicant.id)
    throw new Error("Unauthorized: Submission not owned by applicant");
  if (
    record.review_status === "reviewed" ||
    record.review_status === "locked"
  ) {
    throw new Error(
      "Submission has entered review/locked state and cannot be modified",
    );
  }
  // 2. Prepare the update payload: patch only supplied fields.
  await MyGlobal.prisma.ats_recruitment_coding_test_submissions.update({
    where: { id: submissionId },
    data: {
      ...(body.answer_file_url !== undefined && {
        answer_file_url: body.answer_file_url,
      }),
      ...(body.answer_text !== undefined && {
        answer_text: body.answer_text,
      }),
      ...(body.status !== undefined && {
        status: body.status,
      }),
      ...(body.received_external_at !== undefined && {
        received_external_at:
          body.received_external_at === null
            ? null
            : toISOStringSafe(body.received_external_at),
      }),
      ...(body.review_status !== undefined && {
        review_status: body.review_status,
      }),
      ...(body.reviewed_at !== undefined && {
        reviewed_at:
          body.reviewed_at === null ? null : toISOStringSafe(body.reviewed_at),
      }),
      ...(body.review_comment_summary !== undefined && {
        review_comment_summary: body.review_comment_summary,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 3. Fetch the updated record to ensure correct values and types
  const updated =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: { id: submissionId },
    });
  if (!updated) throw new Error("Updated submission query failed");
  // 4. Return in API DTO format, converting all date fields as required
  return {
    id: updated.id,
    ats_recruitment_coding_test_id: updated.ats_recruitment_coding_test_id,
    ats_recruitment_applicant_id: updated.ats_recruitment_applicant_id,
    ats_recruitment_application_id: updated.ats_recruitment_application_id,
    submitted_at: toISOStringSafe(updated.submitted_at),
    answer_file_url: updated.answer_file_url ?? undefined,
    answer_text: updated.answer_text ?? undefined,
    status: updated.status,
    received_external_at:
      updated.received_external_at === null
        ? null
        : toISOStringSafe(updated.received_external_at),
    review_status: updated.review_status,
    reviewed_at:
      updated.reviewed_at === null
        ? null
        : toISOStringSafe(updated.reviewed_at),
    review_comment_summary: updated.review_comment_summary ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
