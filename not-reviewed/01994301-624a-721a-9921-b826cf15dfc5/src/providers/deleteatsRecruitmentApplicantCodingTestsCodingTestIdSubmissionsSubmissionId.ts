import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Soft delete (mark as deleted) a coding test submission by the applicant.
 *
 * Allows an authenticated applicant to soft-delete (retract) their own coding
 * test submission prior to the review phase. This marks the submission as
 * deleted by setting the `deleted_at` timestamp but retains the submission for
 * audit and compliance.
 *
 * - Ownership is enforced: only the owner applicant can delete their submission.
 * - Deletion is only possible if the submission has not entered the review phase
 *   (`review_status` must not be 'reviewed', 'flagged', or similar).
 * - If the submission is not found, is not owned, is already deleted, or has been
 *   reviewed/locked, an error is thrown.
 * - Upon soft deletion, the action may be logged for audit and traceability (see
 *   platform audit policy).
 *
 * @param props - Contains the authenticated applicant, coding test id, and
 *   submission id.
 * @param props.applicant - Authenticated applicant payload
 * @param props.codingTestId - Coding test id (uuid)
 * @param props.submissionId - Unique submission id (uuid)
 * @returns - Resolves to void on success
 * @throws {Error} - If submission not found, not owned, already deleted, or in
 *   review/locked state
 */
export async function deleteatsRecruitmentApplicantCodingTestsCodingTestIdSubmissionsSubmissionId(props: {
  applicant: ApplicantPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { applicant, codingTestId, submissionId } = props;
  // Find the submission and enforce ownership, not-deleted
  const submission =
    await MyGlobal.prisma.ats_recruitment_coding_test_submissions.findFirst({
      where: {
        id: submissionId,
        ats_recruitment_coding_test_id: codingTestId,
        ats_recruitment_applicant_id: applicant.id,
        deleted_at: null,
      },
    });
  if (!submission) {
    throw new Error("Submission not found or not owned by applicant");
  }
  // Check review status: reviewed/locked phases forbidden
  if (
    submission.review_status === "reviewed" ||
    submission.review_status === "flagged"
  ) {
    throw new Error(
      "Cannot delete submission after review or scoring phase has started",
    );
  }
  // Mark as soft-deleted
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_coding_test_submissions.update({
    where: { id: submissionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // (Optional) Add audit log if required by platform policy.
}
