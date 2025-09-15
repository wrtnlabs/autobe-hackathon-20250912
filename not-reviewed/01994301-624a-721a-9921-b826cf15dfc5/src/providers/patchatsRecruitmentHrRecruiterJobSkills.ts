import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { IPageIAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobSkill";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a filtered, paginated list of job skills for recruitment postings
 * (ats_recruitment_job_skills table).
 *
 * This endpoint enables HR recruiters and system administrators to fetch a
 * paginated and filterable list of job skills, supporting search by skill name,
 * activation status, and creation date range. Only non-deleted records are
 * included. Sorts and paginates data with robust input validation, returns
 * top-level summary objects for UI use.
 *
 * @param props - HrRecruiter: Authenticated HR recruiter user (pre-validated by
 *   decorator). body: Filter, sorting, and pagination request for job skill
 *   listing.
 * @returns Paginated list of job skill summaries matching search criteria.
 * @throws {Error} If database access fails or input is structurally invalid.
 */
export async function patchatsRecruitmentHrRecruiterJobSkills(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobSkill.IRequest;
}): Promise<IPageIAtsRecruitmentJobSkill.ISummary> {
  const { body } = props;

  // Allowed fields for sorting
  const ALLOWED_SORT_FIELDS = [
    "id",
    "name",
    "is_active",
    "created_at",
    "updated_at",
  ] as const;
  type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

  // Validate and normalize sort field
  const sort_by = ALLOWED_SORT_FIELDS.includes(body.sort_by as SortField)
    ? (body.sort_by as SortField)
    : "created_at";
  const sort_dir =
    body.sort_dir === "asc" || body.sort_dir === "desc"
      ? body.sort_dir
      : "desc";

  // Pagination defaults and stripping typia brands
  const page = body.page != null ? Number(body.page) : 1;
  const limit = body.limit != null ? Number(body.limit) : 20;
  const offset = (page - 1) * limit;

  // Build where filter inline
  const where = {
    deleted_at: null,
    // Name: partial match (case-sensitive; no mode property for SQLite compatibility)
    ...(body.name !== undefined &&
      body.name !== null &&
      body.name !== "" && {
        name: { contains: body.name },
      }),
    // is_active: filter only if explicitly specified
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    // created_at date range
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Query total count and page data in parallel
  const [records, data] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_skills.count({ where }),
    MyGlobal.prisma.ats_recruitment_job_skills.findMany({
      where,
      orderBy: { [sort_by]: sort_dir },
      skip: offset,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: limit > 0 ? Math.ceil(records / limit) : 0,
    },
    data: data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      is_active: row.is_active,
    })),
  };
}
