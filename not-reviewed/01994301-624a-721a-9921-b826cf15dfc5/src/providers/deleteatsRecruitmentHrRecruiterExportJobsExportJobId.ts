import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Permanently removes an export job (ats_recruitment_export_jobs) by its unique
 * ID.
 *
 * This operation hard deletes the export job if and only if: (a) it exists, (b)
 * the current HR recruiter is the initiator, and (c) the export job status is
 * 'pending', 'generating', or 'failed'. Completed or delivered jobs cannot be
 * deleted for compliance reasons.
 *
 * @param props - The request props containing:
 *
 *   - HrRecruiter: The authenticated HR recruiter initiating the delete
 *   - ExportJobId: The unique ID of the export job to delete
 *
 * @returns Void (deletes the job if authorized and allowed; throws error
 *   otherwise)
 * @throws {Error} Export job does not exist
 * @throws {Error} Unauthorized: Only initiator can delete this export job
 * @throws {Error} Export job cannot be deleted due to its current status
 */
export async function deleteatsRecruitmentHrRecruiterExportJobsExportJobId(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiter, exportJobId } = props;
  const exportJob = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst(
    {
      where: { id: exportJobId },
    },
  );
  if (!exportJob) throw new Error("Export job not found");
  // Only allow HR recruiter who is the initiator
  if (exportJob.initiator_id !== hrRecruiter.id) {
    throw new Error(
      "Unauthorized: Only the job initiator can delete this export job",
    );
  }
  // Status restriction - only allow if in [pending, generating, failed]
  if (
    exportJob.status !== "pending" &&
    exportJob.status !== "generating" &&
    exportJob.status !== "failed"
  ) {
    throw new Error(
      "Export job cannot be deleted because its status does not allow deletion",
    );
  }
  await MyGlobal.prisma.ats_recruitment_export_jobs.delete({
    where: { id: exportJobId },
  });
}
