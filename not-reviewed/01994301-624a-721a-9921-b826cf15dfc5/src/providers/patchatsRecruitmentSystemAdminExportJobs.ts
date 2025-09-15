import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { IPageIAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportJob";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated, filterable list of export jobs
 * (ats_recruitment_export_jobs) for HR recruiters and admins.
 *
 * This operation allows system administrators to search, filter, and list
 * export job records. Search criteria include job type, status, initiator, date
 * ranges, and more, with support for text search.
 *
 * Only system administrators are authorized to use this function (authorization
 * checked via props). Results are paginated and suitable for dashboard/export
 * history views. Date/time values are always returned as string &
 * tags.Format<'date-time'>, never as native Date.
 *
 * @param props - The request object for export job listing.
 * @param props.systemAdmin - The authenticated system administrator (must be
 *   authorized).
 * @param props.body - Search/filter pagination parameters as defined by
 *   IAtsRecruitmentExportJob.IRequest.
 * @returns A paginated list of export job summaries for management or
 *   compliance review.
 * @throws {Error} If an unsupported sort/order field is provided or a DB error
 *   occurs.
 */
export async function patchatsRecruitmentSystemAdminExportJobs(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentExportJob.IRequest;
}): Promise<IPageIAtsRecruitmentExportJob.ISummary> {
  const { body } = props;

  // Pagination defaults
  const pageValue = body.page ?? 1;
  const limitValue = body.limit ?? 20;
  const page = typeof pageValue === "number" && pageValue > 0 ? pageValue : 1;
  const rawLimit =
    typeof limitValue === "number" && limitValue > 0 ? limitValue : 20;
  const MAX_LIMIT = 100;
  const limit = rawLimit > MAX_LIMIT ? MAX_LIMIT : rawLimit;
  const skip = (page - 1) * limit;

  // Allowed sort fields (only those in schema)
  const allowedSortFields = [
    "created_at",
    "status",
    "job_type",
    "delivered_at",
    "updated_at",
  ];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const order =
    body.order &&
    typeof body.order === "string" &&
    ["asc", "desc"].includes(body.order.toLowerCase())
      ? body.order.toLowerCase()
      : "desc";

  // Build Prisma where clause (excluding soft-deleted)
  const where = {
    deleted_at: null,
    ...(body.job_type !== undefined &&
      body.job_type !== null && { job_type: body.job_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.initiator_id !== undefined &&
      body.initiator_id !== null && { initiator_id: body.initiator_id }),
    ...(body.target_job_posting_id !== undefined &&
      body.target_job_posting_id !== null && {
        target_job_posting_id: body.target_job_posting_id,
      }),
    ...(body.target_application_id !== undefined &&
      body.target_application_id !== null && {
        target_application_id: body.target_application_id,
      }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && { gte: body.from_date }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && { lte: body.to_date }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { request_description: { contains: body.search } },
          { filter_json: { contains: body.search } },
        ],
      }),
  };

  // Query DB for paginated results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_export_jobs.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_export_jobs.count({ where }),
  ]);

  // Map DB results to ISummary DTOs
  const data = rows.map((row) => {
    return {
      id: row.id,
      initiator_id: row.initiator_id,
      job_type: row.job_type,
      status: row.status,
      delivery_method: row.delivery_method,
      delivered_at:
        row.delivered_at !== null && row.delivered_at !== undefined
          ? toISOStringSafe(row.delivered_at)
          : null,
      file_uri: row.file_uri ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  // Assemble and return paginated result (with type-safe conversion for numbers)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
