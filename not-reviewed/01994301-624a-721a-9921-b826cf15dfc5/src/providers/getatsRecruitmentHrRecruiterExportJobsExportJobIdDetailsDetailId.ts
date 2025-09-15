import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a single export job detail record
 * (ats_recruitment_export_job_details) by its ID under a given export job.
 *
 * This endpoint returns the full information for an individual export job
 * detail, including row summary, metadata, and inclusion timestamp. Only the
 * export job creator (HR recruiter) or system admins may access. Returns 404 if
 * the detail does not exist or does not belong to the export job.
 *
 * @param props - Object with authentication, context, and path parameters
 * @param props.hrRecruiter - The authenticated HR recruiter (authorization
 *   context)
 * @param props.exportJobId - Unique identifier of the export job (UUID)
 * @param props.detailId - Unique identifier of the export job detail (UUID)
 * @returns The export job detail record as IAtsRecruitmentExportJobDetail
 * @throws {Error} If the detail does not exist, is not linked to the export
 *   job, or recruiter is not the owner
 */
export async function getatsRecruitmentHrRecruiterExportJobsExportJobIdDetailsDetailId(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExportJobDetail> {
  const { hrRecruiter, exportJobId, detailId } = props;

  // 1. Fetch the export job detail by ID and export_job_id (ownership and existence check)
  const detail =
    await MyGlobal.prisma.ats_recruitment_export_job_details.findFirst({
      where: {
        id: detailId,
        export_job_id: exportJobId,
      },
    });
  if (!detail) throw new Error("Export job detail not found");

  // 2. Fetch the export job and check the initiator
  const job = await MyGlobal.prisma.ats_recruitment_export_jobs.findUnique({
    where: {
      id: exportJobId,
    },
  });
  if (!job) throw new Error("Export job not found");
  if (job.initiator_id !== hrRecruiter.id) throw new Error("Forbidden");

  // 3. Map to DTO, converting data_row_id null→undefined, included_at via toISOStringSafe
  return {
    id: detail.id,
    export_job_id: detail.export_job_id,
    data_row_id: detail.data_row_id === null ? undefined : detail.data_row_id,
    row_summary_json: detail.row_summary_json,
    included_at: toISOStringSafe(detail.included_at),
  };
}
