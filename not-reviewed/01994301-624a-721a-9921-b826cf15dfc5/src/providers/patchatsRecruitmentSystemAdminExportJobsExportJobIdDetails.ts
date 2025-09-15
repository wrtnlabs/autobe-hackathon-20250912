import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import { IPageIAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportJobDetail";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and page through export job details for a specific export job
 * (ats_recruitment_export_job_details).
 *
 * This endpoint allows an authenticated system admin to page and filter through
 * the exported detail records associated with a particular export job. Supports
 * pagination, search on row_summary_json, and inclusion date range filtering.
 * Only accessible to system admins. Returns summary objects for each detail row
 * included in the export job.
 *
 * Authorization: Systemadmin role required.
 *
 * @param props - The request parameters and payload.
 * @param props.systemAdmin - The authenticated systemadmin (already
 *   authorized).
 * @param props.exportJobId - UUID of the export job for which to fetch details.
 * @param props.body - Filtering and paging details, such as page, pageSize,
 *   date range, and row_summary_json filter.
 * @returns Paginated summary of export job detail rows.
 * @throws {Error} If the export job does not exist or access is not permitted.
 */
export async function patchatsRecruitmentSystemAdminExportJobsExportJobIdDetails(props: {
  systemAdmin: SystemadminPayload;
  exportJobId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExportJobDetail.IRequest;
}): Promise<IPageIAtsRecruitmentExportJobDetail.ISummary> {
  const { exportJobId, body } = props;

  // Authorization implied by parameter type

  // Validate the export job exists.
  const exportJob = await MyGlobal.prisma.ats_recruitment_export_jobs.findFirst(
    {
      where: { id: exportJobId },
      select: { id: true },
    },
  );
  if (!exportJob) throw new Error("Export job not found");

  // Setup pagination (defaults: page=1, pageSize=20).
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  // Compose Prisma where clause with filtering by job ID, summary content, and date window
  const where = {
    export_job_id: exportJobId,
    ...(body.row_summary_json !== undefined &&
      body.row_summary_json !== null && {
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

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_export_job_details.findMany({
      where,
      orderBy: { included_at: "desc" },
      skip,
      take: pageSize,
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

  // Map result fields and convert included_at to string & tags.Format<'date-time'>
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data: rows.map((row) => ({
      id: row.id,
      export_job_id: row.export_job_id,
      data_row_id: row.data_row_id === null ? undefined : row.data_row_id,
      row_summary_json: row.row_summary_json,
      included_at: toISOStringSafe(row.included_at),
    })),
  };
}
