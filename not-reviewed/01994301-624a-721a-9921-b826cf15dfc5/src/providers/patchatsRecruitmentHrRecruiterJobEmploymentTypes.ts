import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { IPageIAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobEmploymentType";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a filtered, paginated list of job employment types
 * (ats_recruitment_job_employment_types).
 *
 * This endpoint allows authenticated HR recruiters to search, filter, and
 * paginate the list of job employment types, such as full-time, part-time, or
 * contract types, available in the platform. Filtering includes partial string
 * matches on name/description, date range, and status flag.
 *
 * Security: Only authenticated users with the HR recruiter role (verified via
 * hrRecruiter field) may call this.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter (authorization
 *   enforced)
 * @param props.body - Filtering, search, and pagination parameters
 * @returns Paginated, filtered list of job employment types, including
 *   pagination metadata.
 * @throws {Error} When no authentication or filter/options are invalid
 */
export async function patchatsRecruitmentHrRecruiterJobEmploymentTypes(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobEmploymentType.IRequest;
}): Promise<IPageIAtsRecruitmentJobEmploymentType> {
  const { body } = props;

  // Acceptable sort fields (hard-coded, must match schema exactly)
  const allowedOrderFields = ["name", "created_at", "updated_at"] as const;
  // Determine sorting: order_by must be allowed, default 'created_at'
  const orderField = allowedOrderFields.includes(body.order_by as any)
    ? body.order_by!
    : "created_at";
  const orderDir: "asc" | "desc" = body.order_dir === "asc" ? "asc" : "desc";

  // Pagination logic (defaults: page=1, limit=20)
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;

  // Build filtering logic
  const where = {
    deleted_at: null,
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.search &&
      body.search.length > 0 && {
        OR: [
          { name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
    ...((body.created_from || body.created_to) && {
      created_at: {
        ...(body.created_from && { gte: body.created_from }),
        ...(body.created_to && { lte: body.created_to }),
      },
    }),
    ...((body.updated_from || body.updated_to) && {
      updated_at: {
        ...(body.updated_from && { gte: body.updated_from }),
        ...(body.updated_to && { lte: body.updated_to }),
      },
    }),
  };

  // Run queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_employment_types.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_job_employment_types.count({ where }),
  ]);

  // Map data: convert all Date fields and handle optionals
  const data = rows.map((item) => ({
    id: item.id,
    name: item.name,
    description:
      typeof item.description === "string"
        ? item.description
        : item.description === null
          ? null
          : undefined,
    is_active: item.is_active,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    // deleted_at is optional+nullable, only include if non-null
    ...(item.deleted_at !== undefined && item.deleted_at !== null
      ? { deleted_at: toISOStringSafe(item.deleted_at) }
      : {}),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
