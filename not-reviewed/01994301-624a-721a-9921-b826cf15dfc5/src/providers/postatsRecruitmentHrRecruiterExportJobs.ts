import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new export job (ats_recruitment_export_jobs) for extracting data,
 * initiated by HR or admin.
 *
 * Initiates a new export job in the ATS platform, logging actor, export
 * configuration, and status. Triggers asynchronous export processing and audit
 * trace. Duplicate pending jobs are blocked. Only the authenticated HR
 * recruiter can create a job as initiator.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter who initiates the
 *   export job
 * @param props.body - The export job creation parameters (type, filters,
 *   method, targets, etc.)
 * @returns The newly created export job record with all metadata
 * @throws {Error} When initiator_id is not the authenticated recruiter
 * @throws {Error} When filter_json is not valid JSON
 * @throws {Error} When a duplicate pending export job already exists
 */
export async function postatsRecruitmentHrRecruiterExportJobs(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentExportJob.ICreate;
}): Promise<IAtsRecruitmentExportJob> {
  if (props.hrRecruiter.id !== props.body.initiator_id) {
    throw new Error("Initiator must be the authenticated HR recruiter");
  }
  if (
    typeof props.body.filter_json === "string" &&
    props.body.filter_json.trim().length > 0
  ) {
    try {
      JSON.parse(props.body.filter_json);
    } catch (_) {
      throw new Error("filter_json must be a valid JSON string");
    }
  }
  const duplicate = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst(
    {
      where: {
        initiator_id: props.body.initiator_id,
        job_type: props.body.job_type,
        delivery_method: props.body.delivery_method,
        status: "pending",
      },
    },
  );
  if (duplicate) {
    throw new Error("Duplicate pending export job exists");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ats_recruitment_export_jobs.create({
    data: {
      id: v4(),
      initiator_id: props.body.initiator_id,
      target_job_posting_id: props.body.target_job_posting_id ?? null,
      target_application_id: props.body.target_application_id ?? null,
      job_type: props.body.job_type,
      status: "pending",
      request_description: props.body.request_description ?? null,
      filter_json: props.body.filter_json ?? null,
      delivery_method: props.body.delivery_method,
      delivered_at: null,
      file_uri: null,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    initiator_id: created.initiator_id,
    target_job_posting_id: created.target_job_posting_id ?? null,
    target_application_id: created.target_application_id ?? null,
    job_type: created.job_type,
    status: created.status,
    request_description: created.request_description ?? null,
    filter_json: created.filter_json ?? null,
    delivery_method: created.delivery_method,
    delivered_at: created.delivered_at ?? null,
    file_uri: created.file_uri ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
