import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import { IPageIAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentResume";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Search and retrieve a paginated, filtered list of the applicant's resumes
 * (ats_recruitment_resumes).
 *
 * This endpoint allows authenticated applicants to view, filter, and page
 * through their own resume records in the ATS. Filtering supports title
 * substring matches and creation date ranges, sorting is supported by creation
 * or update timestamp, and only active (non-deleted) resumes are included.
 * Results are paginated.
 *
 * @param props - The properties for the search operation.
 * @param props.applicant - The authenticated applicant making the request.
 * @param props.body - Filtering and pagination parameters (title, date range,
 *   page, limit, sort field).
 * @returns A paginated list of IAtsRecruitmentResume.ISummary matching the
 *   applicant's query.
 * @throws {Error} If there is any internal problem applying filters or reading
 *   from database.
 */
export async function patchatsRecruitmentApplicantResumes(props: {
  applicant: ApplicantPayload;
  body: IAtsRecruitmentResume.IRequest;
}): Promise<IPageIAtsRecruitmentResume.ISummary> {
  const { applicant, body } = props;

  // Defaults: page (min 1), limit (min 1)
  const pageRaw = body.page !== undefined && body.page !== null ? body.page : 1;
  const limitRaw =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const page = Math.max(Number(pageRaw), 1);
  const limit = Math.max(Number(limitRaw), 1);

  // Sort field logic: only whitelisted fields allowed
  const allowedSortFields = ["created_at", "updated_at"];
  const sortParam =
    body.sort !== undefined && body.sort !== null ? body.sort : "-created_at";
  const desc = sortParam.startsWith("-");
  const rawSortField = sortParam.replace(/^[-+]/, "");
  const sortField = allowedSortFields.includes(rawSortField)
    ? rawSortField
    : "created_at";

  // WHERE clause
  const where: Record<string, unknown> = {
    ats_recruitment_applicant_id: applicant.id,
    deleted_at: null,
  };
  // Title filter (partial match, case-insensitive search)
  if (
    body.title !== undefined &&
    body.title !== null &&
    body.title.length > 0
  ) {
    where.title = { contains: body.title };
  }

  // Created_at range: gte/lte logic.
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    const createdAtCond: Record<string, string & tags.Format<"date-time">> = {};
    if (body.created_from !== undefined && body.created_from !== null) {
      createdAtCond.gte = body.created_from;
    }
    if (body.created_to !== undefined && body.created_to !== null) {
      createdAtCond.lte = body.created_to;
    }
    where.created_at = createdAtCond;
  }

  // Total count for pagination
  const total = await MyGlobal.prisma.ats_recruitment_resumes.count({ where });

  // Main paging query for resume summaries
  const rows = await MyGlobal.prisma.ats_recruitment_resumes.findMany({
    where,
    orderBy: { [sortField]: desc ? "desc" : "asc" },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      title: true,
      created_at: true,
      updated_at: true,
    },
  });

  // Map to DTOs, format date fields using toISOStringSafe (no Date)
  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination meta (must be numbers to satisfy tags.Type/int32)
  const records = Number(total);
  const curPage = Number(page);
  const perPage = Number(limit);
  const pages = Math.ceil(records / (perPage || 1));

  return {
    pagination: {
      current: curPage,
      limit: perPage,
      records,
      pages,
    },
    data,
  };
}
