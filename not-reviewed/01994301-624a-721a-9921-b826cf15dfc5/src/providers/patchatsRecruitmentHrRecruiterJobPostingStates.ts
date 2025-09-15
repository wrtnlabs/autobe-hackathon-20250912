import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { IPageIAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPostingState";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Search and list job posting states from ats_recruitment_job_posting_states.
 *
 * Retrieves a paginated and optionally filtered list of job posting state
 * definitions. Supports advanced searching (by code, label, description),
 * filtering (is_active, state_codes, date range), sorting, and pagination.
 * Results are restricted to authenticated HR recruiters.
 *
 * @param props - Object containing authentication and request filter/pagination
 *   parameters
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   search (context authorization)
 * @param props.body - Request parameters for filtering, searching, sorting, and
 *   pagination (IAtsRecruitmentJobPostingState.IRequest)
 * @returns Paginated list of job posting states matching search/filter
 * @throws {Error} For database errors or invalid parameters (e.g. empty
 *   state_codes array)
 */
export async function patchatsRecruitmentHrRecruiterJobPostingStates(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobPostingState.IRequest;
}): Promise<IPageIAtsRecruitmentJobPostingState> {
  const { body } = props;

  // Page, limit (typia brands: number & tags.Type<"int32"> & tags.Minimum<0/1>)
  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = page * limit;

  // Allowed sorting fields
  const allowedOrderBy = ["label", "sort_order", "created_at", "updated_at"];
  const order_by = allowedOrderBy.includes(body.order_by ?? "")
    ? body.order_by!
    : "sort_order";
  const order_dir = body.order_dir === "desc" ? "desc" : "asc";

  // WHERE clause
  const where = {
    // Filter: text search (OR on state_code, label, description)
    ...(body.search && {
      OR: [
        { state_code: { contains: body.search } },
        { label: { contains: body.search } },
        { description: { contains: body.search } },
      ],
    }),
    // Filter: is_active
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    // Filter: state_codes (enforce non-empty)
    ...(body.state_codes &&
      Array.isArray(body.state_codes) &&
      body.state_codes.length > 0 && {
        state_code: { in: body.state_codes },
      }),
    // Filter: created_at date range
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Query for data & count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_posting_states.findMany({
      where,
      orderBy: { [order_by]: order_dir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_job_posting_states.count({ where }),
  ]);

  // Map to DTO (convert all dates to string & tags.Format<'date-time'>)
  const data = rows.map((row) => {
    return {
      id: row.id,
      state_code: row.state_code,
      label: row.label,
      description: row.description ?? null,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    };
  });

  // Pagination: must unbrand for IPage.IPagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
