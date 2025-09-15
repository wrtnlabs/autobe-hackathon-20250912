import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a specific applicant resume by ID (GDPR-compliant erasure).
 *
 * Performs a soft delete on an applicant's resume by setting the deleted_at
 * field in the ats_recruitment_resumes table to the current timestamp, thus
 * enabling GDPR-compliant deletion and recovery. This action is restricted to
 * system administrators with active status. Deleting a resume in this way
 * retains all related applicant, upload, and audit trail data. This operation
 * is idempotent—resumes already deleted or non-existent return a 404 error.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated, active system administrator user
 * @param props.resumeId - The unique resume UUID to delete
 * @returns Void
 * @throws {Error} If the resume does not exist or is already deleted
 */
export async function deleteatsRecruitmentSystemAdminResumesResumeId(props: {
  systemAdmin: SystemadminPayload;
  resumeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the resume only if not already soft-deleted
  const resume = await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
    where: {
      id: props.resumeId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!resume) {
    throw new Error("Resume not found or already deleted");
  }
  // Soft delete the resume by setting deleted_at
  await MyGlobal.prisma.ats_recruitment_resumes.update({
    where: { id: props.resumeId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
