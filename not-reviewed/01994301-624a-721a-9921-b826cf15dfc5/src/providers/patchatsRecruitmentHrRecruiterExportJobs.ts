import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import { IPageIAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportJob";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a paginated, filterable list of export jobs
 * (ats_recruitment_export_jobs) for HR recruiters and admins.
 *
 * This endpoint allows HR recruiters to search and list export job operations
 * (such as applicant info, compliance reports) from the ATS system. It supports
 * filtering by status, job type, initiator, target posting/application,
 * free-text search (description or filter_json), date ranges, and includes full
 * pagination and sorting.
 *
 * Results include job IDs, creator (initiator_id), job type, status, delivery
 * method, timestamps, file URI, metadata as defined in the schema. Dates are
 * always ISO8601 strings, UUIDs are branded.
 *
 * Authorization: Only HR recruiters (hrRecruiter type payload) can use this
 * endpoint.
 *
 * @param props - Request object
 * @param props.hrRecruiter - Authenticated HR recruiter making the query
 * @param props.body - Query and filter parameters (see
 *   IAtsRecruitmentExportJob.IRequest)
 * @returns A paged summary of export jobs matching the criteria
 * @throws {Error} If request fails or illegal parameters provided
 */
export async function patchatsRecruitmentHrRecruiterExportJobs(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentExportJob.IRequest;
}): Promise<IPageIAtsRecruitmentExportJob.ISummary> {
  const { hrRecruiter, body } = props;
  const pageRaw =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limitRaw =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // Search and filter
  const where: Record<string, unknown> = {
    initiator_id: hrRecruiter.id,
  };
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }
  if (body.job_type !== undefined && body.job_type !== null) {
    where.job_type = body.job_type;
  }
  if (
    body.target_job_posting_id !== undefined &&
    body.target_job_posting_id !== null
  ) {
    where.target_job_posting_id = body.target_job_posting_id;
  }
  if (
    body.target_application_id !== undefined &&
    body.target_application_id !== null
  ) {
    where.target_application_id = body.target_application_id;
  }
  if (body.initiator_id !== undefined && body.initiator_id !== null) {
    where.initiator_id = body.initiator_id;
  }
  if (
    (body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
  ) {
    where.created_at = {};
    if (body.from_date !== undefined && body.from_date !== null) {
      (where.created_at as Record<string, unknown>).gte = body.from_date;
    }
    if (body.to_date !== undefined && body.to_date !== null) {
      (where.created_at as Record<string, unknown>).lte = body.to_date;
    }
  }
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.OR = [
      { request_description: { contains: body.search } },
      { filter_json: { contains: body.search } },
    ];
  }

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const allowedSortFields = [
      "created_at",
      "status",
      "job_type",
      "delivered_at",
    ];
    const sortField = allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
    const sortOrder: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";
    orderBy = { [sortField]: sortOrder };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_export_jobs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        initiator_id: true,
        job_type: true,
        status: true,
        delivery_method: true,
        delivered_at: true,
        file_uri: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_export_jobs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => {
      return {
        id: row.id,
        initiator_id: row.initiator_id,
        job_type: row.job_type,
        status: row.status,
        delivery_method: row.delivery_method,
        delivered_at: row.delivered_at
          ? toISOStringSafe(row.delivered_at)
          : null,
        file_uri: row.file_uri ?? null,
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
      };
    }),
  };
}
