import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Get details about a specific export job (ats_recruitment_export_jobs) by
 * exportJobId.
 *
 * Fetches detailed information about a specific export job from the ATS
 * platform, identified by exportJobId. Returns all export configuration
 * parameters such as job type, initiator, target entity, status, file URI,
 * timestamps, and audit/compliance details, as per the
 * ats_recruitment_export_jobs model.
 *
 * Access is restricted to HR recruiters who are the initiator of the export
 * job. If the export job does not exist or the requester is not authorized, an
 * error is thrown.
 *
 * @param props - Object containing HR recruiter authentication and exportJobId
 * @param props.hrRecruiter - Authenticated recruiter performing the fetch
 *   (payload with id)
 * @param props.exportJobId - The unique identifier for the export job to
 *   retrieve (UUID)
 * @returns The full export job configuration and delivery information, mapped
 *   to IAtsRecruitmentExportJob
 * @throws {Error} When export job is not found or access is forbidden
 */
export async function getatsRecruitmentHrRecruiterExportJobsExportJobId(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExportJob> {
  const { hrRecruiter, exportJobId } = props;
  const job = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst({
    where: {
      id: exportJobId,
      // deleted_at: null, // removed: deleted_at does not exist in type
    },
  });
  if (!job) throw new Error("Export job not found");
  if (job.initiator_id !== hrRecruiter.id) {
    throw new Error("Forbidden");
  }
  return {
    id: job.id,
    initiator_id: job.initiator_id,
    target_job_posting_id: job.target_job_posting_id ?? null,
    target_application_id: job.target_application_id ?? null,
    job_type: job.job_type,
    status: job.status,
    request_description: job.request_description ?? null,
    filter_json: job.filter_json ?? null,
    delivery_method: job.delivery_method,
    delivered_at: job.delivered_at ? toISOStringSafe(job.delivered_at) : null,
    file_uri: job.file_uri ?? null,
    created_at: toISOStringSafe(job.created_at),
    updated_at: toISOStringSafe(job.updated_at),
  };
}
