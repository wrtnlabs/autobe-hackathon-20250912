import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update details of a specific export job (such as fixing status, updating
 * delivery details, or modifying the request description) in the ATS platform.
 *
 * Updates are only permitted for mutable fields (business/compliance
 * restriction): status, request_description, delivery_method, delivered_at,
 * file_uri, filter_json, target_job_posting_id, and target_application_id. Job
 * type, initiator, creation time, and job id are immutable. Only the job
 * creator HR recruiter may update.
 *
 * Update is disallowed if job is already completed or delivered. All datetime
 * fields are consistently returned as branded ISO strings. Dates are never
 * handled as native Date objects.
 *
 * @param props - Properties for the provider function
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   update
 * @param props.exportJobId - Unique export job identifier (UUID)
 * @param props.body - Update payload for fields to update (only supplied fields
 *   will be updated)
 * @returns Updated export job record with proper audit-compliant structure
 * @throws {Error} If the job is not found, not owned by current HR, or not
 *   updatable
 */
export async function putatsRecruitmentHrRecruiterExportJobsExportJobId(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExportJob.IUpdate;
}): Promise<IAtsRecruitmentExportJob> {
  const { hrRecruiter, exportJobId, body } = props;

  // 1. Retrieve & validate export job
  const job = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst({
    where: {
      id: exportJobId,
    },
  });
  if (!job) throw new Error("Export job not found");
  if (job.initiator_id !== hrRecruiter.id) {
    throw new Error(
      "Unauthorized: Only the job creator HR may update this export job",
    );
  }
  if (job.status === "complete" || job.status === "delivered") {
    throw new Error("Cannot update a completed or delivered export job");
  }

  // 2. Prepare update data for allowed mutable fields only
  const updateData: Record<string, unknown> = {};

  if (typeof body.status !== "undefined") {
    updateData.status = body.status;
  }
  if (typeof body.request_description !== "undefined") {
    updateData.request_description = body.request_description;
  }
  if (typeof body.delivery_method !== "undefined") {
    updateData.delivery_method = body.delivery_method;
  }
  if (typeof body.delivered_at !== "undefined") {
    updateData.delivered_at =
      body.delivered_at === null ? null : toISOStringSafe(body.delivered_at);
  }
  if (typeof body.file_uri !== "undefined") {
    updateData.file_uri = body.file_uri;
  }
  if (typeof body.filter_json !== "undefined") {
    updateData.filter_json = body.filter_json;
  }
  if (typeof body.target_job_posting_id !== "undefined") {
    updateData.target_job_posting_id = body.target_job_posting_id;
  }
  if (typeof body.target_application_id !== "undefined") {
    updateData.target_application_id = body.target_application_id;
  }
  // Always set updated_at to current time with required branding
  updateData.updated_at = toISOStringSafe(new Date());

  // 3. Update and fetch updated row
  const updated = await MyGlobal.prisma.ats_recruitment_export_jobs.update({
    where: { id: exportJobId },
    data: updateData,
  });

  // 4. Return the updated job, ensuring date string formats throughout
  return {
    id: updated.id,
    initiator_id: updated.initiator_id,
    target_job_posting_id: updated.target_job_posting_id ?? undefined,
    target_application_id: updated.target_application_id ?? undefined,
    job_type: updated.job_type,
    status: updated.status,
    request_description:
      typeof updated.request_description !== "undefined"
        ? updated.request_description
        : undefined,
    filter_json:
      typeof updated.filter_json !== "undefined"
        ? updated.filter_json
        : undefined,
    delivery_method: updated.delivery_method,
    delivered_at:
      updated.delivered_at === null ||
      typeof updated.delivered_at === "undefined"
        ? null
        : toISOStringSafe(updated.delivered_at),
    file_uri:
      typeof updated.file_uri !== "undefined" ? updated.file_uri : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
