import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new ATS export job initiated by a system administrator.
 *
 * Inserts a new export job row into the ats_recruitment_export_jobs table using
 * the provided configuration. Only authenticated system admins are permitted to
 * create jobs, and may only set themselves as initiator. On creation, initial
 * status is set to 'pending'. Creation triggers the export workflow; this
 * method returns the created job record compliant with
 * IAtsRecruitmentExportJob, with all metadata and dates as branded ISO
 * strings.
 *
 * @param props - Properties for export job creation
 * @param props.systemAdmin - The authenticated system admin (payload with UUID)
 * @param props.body - Export job creation DTO specifying job_type, delivery,
 *   filters, etc.
 * @returns The created export job record as IAtsRecruitmentExportJob
 * @throws Error if the initiator does not match authenticated admin, or if
 *   required fields are missing/invalid
 */
export async function postatsRecruitmentSystemAdminExportJobs(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentExportJob.ICreate;
}): Promise<IAtsRecruitmentExportJob> {
  const { systemAdmin, body } = props;

  // Authorization: only allow creating a job for oneself
  if (body.initiator_id !== systemAdmin.id) {
    throw new Error(
      "Permission denied: initiator_id must match authenticated systemAdmin",
    );
  }

  // Generate UUID and current timestamp (ISO string)
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Insert export job into DB
  const created = await MyGlobal.prisma.ats_recruitment_export_jobs.create({
    data: {
      id,
      initiator_id: body.initiator_id,
      job_type: body.job_type,
      delivery_method: body.delivery_method,
      status: "pending",
      target_job_posting_id: body.target_job_posting_id ?? null,
      target_application_id: body.target_application_id ?? null,
      request_description: body.request_description ?? null,
      filter_json: body.filter_json ?? null,
      delivered_at: null,
      file_uri: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    initiator_id: created.initiator_id,
    target_job_posting_id: created.target_job_posting_id ?? undefined,
    target_application_id: created.target_application_id ?? undefined,
    job_type: created.job_type,
    status: created.status,
    request_description: created.request_description ?? undefined,
    filter_json: created.filter_json ?? undefined,
    delivery_method: created.delivery_method,
    delivered_at: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : undefined,
    file_uri: created.file_uri ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
