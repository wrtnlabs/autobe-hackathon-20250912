import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details about a specific export job (ats_recruitment_export_jobs) by
 * exportJobId.
 *
 * Fetch detailed information about a specific export job from the ATS platform,
 * identified by exportJobId. Returned data includes all export configuration
 * parameters such as job type, target entity, initiator, status, file URI,
 * timestamps, and audit details, per the ats_recruitment_export_jobs model in
 * the Prisma schema.
 *
 * This operation supports audit/compliance workflows, allowing authorized HR
 * recruiters or system administrators to inspect the export's full metadata,
 * delivery results, and any associated errors or failures. The information
 * helps in verifying export scope, data coverage, and troubleshooting
 * post-delivery issues.
 *
 * The endpoint expects a valid exportJobId (UUID) as a path parameter. If the
 * export job does not exist or the user lacks privileges, an error is returned.
 * Related endpoints include export job list/search, export job update (status
 * or metadata change), and job outputs download.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.exportJobId - Unique identifier (UUID) for the export job to
 *   retrieve
 * @returns Detailed export job record and associated metadata
 * @throws {Error} When the export job does not exist or is inaccessible
 */
export async function getatsRecruitmentSystemAdminExportJobsExportJobId(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExportJob> {
  const job = await MyGlobal.prisma.ats_recruitment_export_jobs.findUnique({
    where: { id: props.exportJobId },
    select: {
      id: true,
      initiator_id: true,
      target_job_posting_id: true,
      target_application_id: true,
      job_type: true,
      status: true,
      request_description: true,
      filter_json: true,
      delivery_method: true,
      delivered_at: true,
      file_uri: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!job) throw new Error("Export job not found");
  return {
    id: job.id,
    initiator_id: job.initiator_id,
    target_job_posting_id: job.target_job_posting_id ?? undefined,
    target_application_id: job.target_application_id ?? undefined,
    job_type: job.job_type,
    status: job.status,
    request_description: job.request_description ?? undefined,
    filter_json: job.filter_json ?? undefined,
    delivery_method: job.delivery_method,
    delivered_at: job.delivered_at
      ? toISOStringSafe(job.delivered_at)
      : undefined,
    file_uri: job.file_uri ?? undefined,
    created_at: toISOStringSafe(job.created_at),
    updated_at: toISOStringSafe(job.updated_at),
  };
}
