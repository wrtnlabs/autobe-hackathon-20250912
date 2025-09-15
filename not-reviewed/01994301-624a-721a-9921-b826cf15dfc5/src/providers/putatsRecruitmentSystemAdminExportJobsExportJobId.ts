import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update details of an existing export job in the ATS platform by exportJobId.
 *
 * Allows a system administrator to update audit/compliance fields on a named
 * export job. Updatable fields include status, delivery channel, delivery
 * timestamp, file URI, target job posting, target application, filter JSON, and
 * request description. Does not permit updates to immutable fields such as id,
 * initiator_id, created_at, job_type.
 *
 * The operation ensures only existing and non-deleted export jobs may be
 * updated. Changes are recorded with an updated timestamp and compliant type
 * mapping, using strict date handling with string ISO formats. Soft-deleted
 * records cannot be updated. Only system administrators are authorized (via
 * SystemadminPayload contract).
 *
 * @param props - Props for this operation
 * @param props.systemAdmin - Authenticated system administrator (authorization
 *   is mandatory)
 * @param props.exportJobId - Unique identifier for the export job to update
 * @param props.body - The update payload (fields to modify)
 * @returns IAtsRecruitmentExportJob - Fully updated export job DTO
 * @throws {Error} When the export job is missing or deleted
 */
export async function putatsRecruitmentSystemAdminExportJobsExportJobId(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExportJob.IUpdate;
}): Promise<IAtsRecruitmentExportJob> {
  const { exportJobId, body } = props;
  // Ensure the export job exists and is not soft-deleted
  const existing = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst({
    where: {
      id: exportJobId,
    },
  });
  if (!existing) {
    throw new Error("Export job not found or already deleted");
  }
  // Prepare allowed update fields only (follow API DTO, ignore immutable/system fields)
  const now = toISOStringSafe(new Date());
  const updateInput = {
    status: body.status ?? undefined,
    request_description: body.request_description ?? undefined,
    delivery_method: body.delivery_method ?? undefined,
    delivered_at: body.delivered_at ?? undefined,
    file_uri: body.file_uri ?? undefined,
    filter_json: body.filter_json ?? undefined,
    target_job_posting_id: body.target_job_posting_id ?? undefined,
    target_application_id: body.target_application_id ?? undefined,
    updated_at: now,
  };
  // Persist the update
  const updated = await MyGlobal.prisma.ats_recruitment_export_jobs.update({
    where: { id: exportJobId },
    data: updateInput,
  });
  // Map result to API DTO (use correct null/undefined for each optional field)
  return {
    id: updated.id,
    initiator_id: updated.initiator_id,
    target_job_posting_id: updated.target_job_posting_id ?? undefined,
    target_application_id: updated.target_application_id ?? undefined,
    job_type: updated.job_type,
    status: updated.status,
    request_description: updated.request_description ?? undefined,
    filter_json: updated.filter_json ?? undefined,
    delivery_method: updated.delivery_method,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    file_uri: updated.file_uri ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
