import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Create a new code test submission for a coding test
 * (ats_recruitment_coding_test_submissions table).
 *
 * This endpoint enables applicants to submit answers for a given coding test.
 * It creates a record referencing the coding test ID, applicant ID (inferred
 * from authentication/session), and stores the provided answer as a file URL
 * and/or text. It enforces that each applicant can submit only once per coding
 * test (unique constraint), and on success, returns the complete submission
 * object with all details, status, and audit/date fields as strings. All
 * timestamps and IDs use ISO 8601 or UUID v4 formats; no native Date or type
 * assertion is used. Duplicate attempts are denied with a clear error. Only
 * authenticated applicants can access this operation.
 *
 * @param props - Request parameters and body
 * @param props.applicant - Authenticated applicant payload context
 * @param props.codingTestId - Coding test UUID this submission targets
 * @param props.body - Submission content (answer, status, etc.)
 * @returns Complete coding test submission object as stored
 * @throws {Error} If the applicant has already submitted for this coding test
 * @throws {Error} If creation fails due to invalid references (foreign key
 *   constraint failure)
 */
export async function postatsRecruitmentApplicantCodingTestsCodingTestIdSubmissions(props: {
  applicant: ApplicantPayload;
  codingTestId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestSubmission.ICreate;
}): Promise<IAtsRecruitmentCodingTestSubmission> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.ats_recruitment_coding_test_submissions.create({
        data: {
          id: v4(),
          ats_recruitment_coding_test_id: props.codingTestId,
          ats_recruitment_applicant_id: props.applicant.id,
          ats_recruitment_application_id:
            props.body.ats_recruitment_application_id,
          submitted_at: props.body.submitted_at,
          answer_file_url: props.body.answer_file_url ?? null,
          answer_text: props.body.answer_text ?? null,
          status: props.body.status,
          received_external_at: props.body.received_external_at ?? null,
          review_status: props.body.review_status,
          reviewed_at: props.body.reviewed_at ?? null,
          review_comment_summary: props.body.review_comment_summary ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      ats_recruitment_coding_test_id: created.ats_recruitment_coding_test_id,
      ats_recruitment_applicant_id: created.ats_recruitment_applicant_id,
      ats_recruitment_application_id: created.ats_recruitment_application_id,
      submitted_at: toISOStringSafe(created.submitted_at),
      answer_file_url: created.answer_file_url ?? undefined,
      answer_text: created.answer_text ?? undefined,
      status: created.status,
      received_external_at: created.received_external_at
        ? toISOStringSafe(created.received_external_at)
        : undefined,
      review_status: created.review_status,
      reviewed_at: created.reviewed_at
        ? toISOStringSafe(created.reviewed_at)
        : undefined,
      review_comment_summary: created.review_comment_summary ?? undefined,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation: already submitted to this coding test
      throw new Error(
        "Applicant has already submitted an answer for this coding test.",
      );
    }
    throw error;
  }
}
