import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { IPageIAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPostingState";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list job posting states from ats_recruitment_job_posting_states.
 *
 * Retrieves a paginated and optionally filtered list of all job posting states
 * currently defined in the system. Key fields include state_code, label,
 * description, is_active, and sort_order. Supports advanced filtering,
 * searching by code/label/description, filtering by activation status or
 * specific codes, date range filtering, pagination, and sorting by activation
 * or sort order. Only system administrators may access this endpoint.
 *
 * @param props -
 *
 *   - SystemAdmin: The authenticated system administrator's payload.
 *   - Body: Search, filter, pagination, and sorting parameters per
 *       IAtsRecruitmentJobPostingState.IRequest.
 *
 * @returns Paginated list of job posting states matching the criteria, in
 *   IPageIAtsRecruitmentJobPostingState format.
 * @throws {Error} If database access fails or parameters are invalid.
 */
export async function patchatsRecruitmentSystemAdminJobPostingStates(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobPostingState.IRequest;
}): Promise<IPageIAtsRecruitmentJobPostingState> {
  const { body } = props;

  // Pagination defaults
  const page = typeof body.page === "number" ? Number(body.page) : 0;
  const limit = typeof body.limit === "number" ? Number(body.limit) : 20;

  // Prisma where clause construction (handles all filters)
  const where = {
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...(Array.isArray(body.state_codes) &&
      body.state_codes.length > 0 && {
        state_code: { in: body.state_codes },
      }),
    ...(body.search && {
      OR: [
        { state_code: { contains: body.search } },
        { label: { contains: body.search } },
        { description: { contains: body.search } },
      ],
    }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };

  // Sorting rules
  const allowedOrderFields = [
    "sort_order",
    "created_at",
    "state_code",
    "label",
    "is_active",
  ];
  const orderByField = allowedOrderFields.includes(body.order_by ?? "")
    ? body.order_by!
    : "sort_order";
  const orderDirection = body.order_dir === "asc" ? "asc" : "desc";

  // Query DB (findMany for data, count for total)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_posting_states.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_job_posting_states.count({ where }),
  ]);

  // Map records to IAtsRecruitmentJobPostingState (ensuring correct branding)
  const data = rows.map((row) => {
    return {
      id: row.id,
      state_code: row.state_code,
      label: row.label,
      description:
        row.description === null || row.description === undefined
          ? undefined
          : row.description,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null || row.deleted_at === undefined
          ? undefined
          : toISOStringSafe(row.deleted_at),
    };
  });

  // Final response structure
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
