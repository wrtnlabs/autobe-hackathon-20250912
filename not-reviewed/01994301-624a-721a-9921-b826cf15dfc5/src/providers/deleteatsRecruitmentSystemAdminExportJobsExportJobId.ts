import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a specific export job entry (ats_recruitment_export_jobs) by its
 * unique ID.
 *
 * This operation enables authorized system administrators to delete export jobs
 * that are not yet completed or delivered. The deletion is a hard delete
 * because the schema does not have a soft delete field. Only jobs with status
 * 'pending', 'generating', or 'failed', and which are not already delivered,
 * may be deleted.
 *
 * Attempting to delete jobs that are already completed or delivered, or that do
 * not exist, results in an error. Deletion actions are intended for compliance
 * and workflow clean-up.
 *
 * @param props - Object containing the system administrator payload and the
 *   export job unique ID
 * @param props.systemAdmin - Authenticated systemadmin JWT payload (id and
 *   type)
 * @param props.exportJobId - Unique export job identifier (UUID)
 * @returns Void
 * @throws {Error} If the export job does not exist, is already deleted (i.e.
 *   not found), or is ineligible for deletion
 */
export async function deleteatsRecruitmentSystemAdminExportJobsExportJobId(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
}): Promise<void> {
  const allowedStatuses = ["pending", "generating", "failed"];
  const job = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst({
    where: {
      id: props.exportJobId,
    },
    select: {
      id: true,
      initiator_id: true,
      status: true,
      delivered_at: true,
    },
  });
  if (job === null) {
    throw new Error("Export job not found");
  }
  if (!allowedStatuses.includes(job.status) || job.delivered_at !== null) {
    throw new Error(
      "Cannot delete export job: already completed, delivered, or ineligible status",
    );
  }
  await MyGlobal.prisma.ats_recruitment_export_jobs.delete({
    where: { id: props.exportJobId },
  });
}
