import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import { IPageIAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportJobDetail";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Search and page through export job details for a specific export job
 * (ats_recruitment_export_job_details).
 *
 * This endpoint allows an authenticated HR recruiter to retrieve a paginated
 * and filtered list of export job detail rows for a particular export job they
 * have initiated. Supports filtering by summary content and inclusion time
 * range for compliance/audit.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated recruiter requesting access
 * @param props.exportJobId - The export job UUID whose details are being
 *   fetched
 * @param props.body - Optional paging and filtering criteria
 * @returns Paginated export job detail summary records including all
 *   matched/visible records
 * @throws {Error} When the authenticated recruiter is not the export job
 *   initiator, or job does not exist
 */
export async function patchatsRecruitmentHrRecruiterExportJobsExportJobIdDetails(props: {
  hrRecruiter: HrrecruiterPayload;
  exportJobId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExportJobDetail.IRequest;
}): Promise<IPageIAtsRecruitmentExportJobDetail.ISummary> {
  const { hrRecruiter, exportJobId, body } = props;

  // 1. Authorization: recruiter must be the initiator of the export job
  const job = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst({
    where: { id: exportJobId },
    select: { initiator_id: true },
  });
  if (!job || job.initiator_id !== hrRecruiter.id) {
    throw new Error(
      "Forbidden: You do not have access to this export job's details.",
    );
  }

  // 2. Normalize pagination parameters (defaults: page=1, pageSize=20)
  let page = 1;
  if (typeof body.page === "number" && body.page > 0) page = Number(body.page);
  let pageSize = 20;
  if (typeof body.pageSize === "number" && body.pageSize > 0)
    pageSize = Number(body.pageSize);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 3. Build Prisma where conditions inline, never as intermediate variable
  // Note: all filters are optional except export_job_id (required)
  const where = {
    export_job_id: exportJobId,
    ...(body.row_summary_json !== undefined &&
      body.row_summary_json !== null &&
      body.row_summary_json !== "" && {
        row_summary_json: { contains: body.row_summary_json },
      }),
    ...((body.included_at_from !== undefined &&
      body.included_at_from !== null) ||
    (body.included_at_to !== undefined && body.included_at_to !== null)
      ? {
          included_at: {
            ...(body.included_at_from !== undefined &&
              body.included_at_from !== null && { gte: body.included_at_from }),
            ...(body.included_at_to !== undefined &&
              body.included_at_to !== null && { lte: body.included_at_to }),
          },
        }
      : {}),
  };

  // 4. Query data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_export_job_details.findMany({
      where,
      orderBy: { included_at: "desc" },
      skip,
      take,
      select: {
        id: true,
        export_job_id: true,
        data_row_id: true,
        row_summary_json: true,
        included_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_export_job_details.count({ where }),
  ]);

  // 5. Map DB records to ISummary, converting all date fields
  const data = rows.map((row) => ({
    id: row.id,
    export_job_id: row.export_job_id,
    data_row_id: row.data_row_id === null ? undefined : row.data_row_id,
    row_summary_json: row.row_summary_json,
    included_at: toISOStringSafe(row.included_at),
  }));

  // 6. Format pagination with correct tagging (convert to plain number for compatibility)
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(pageSize)),
    },
    data,
  };
}
