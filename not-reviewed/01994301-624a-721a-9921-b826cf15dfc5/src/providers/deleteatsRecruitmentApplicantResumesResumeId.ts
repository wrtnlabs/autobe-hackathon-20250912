import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Soft-delete a specific applicant resume by ID (GDPR-compliant erasure).
 *
 * Performs a soft-delete on a resume owned by the authenticated applicant. Sets
 * the `deleted_at` field to the current timestamp, making the resume hidden
 * from application and list results while preserving audit trails. Only the
 * resume owner may perform this action. Attempts to delete a non-existent or
 * already-deleted resume result in a 404 error. Attempts to delete a resume not
 * owned by the current applicant result in a 403 error.
 *
 * @param props - Request parameters and context
 * @param props.applicant - The authenticated applicant performing the deletion
 * @param props.resumeId - The UUID of the resume to be deleted
 * @returns Void
 * @throws {Error} 403 Forbidden if attempting to delete a resume you do not own
 * @throws {Error} 404 Not Found if the resume does not exist or is already
 *   deleted
 */
export async function deleteatsRecruitmentApplicantResumesResumeId(props: {
  applicant: ApplicantPayload;
  resumeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { applicant, resumeId } = props;
  // Retrieve the resume (must not be soft-deleted)
  const resume = await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
    where: {
      id: resumeId,
      deleted_at: null,
    },
  });
  if (!resume) throw new Error("Resume not found");
  if (resume.ats_recruitment_applicant_id !== applicant.id)
    throw new Error("Forbidden: Not your resume");

  // Perform soft-delete by setting deleted_at to current date-time
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.ats_recruitment_resumes.update({
    where: { id: resumeId },
    data: { deleted_at: deletedAt },
  });
}
