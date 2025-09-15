import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import { IPageIStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search, filter, and paginate system administrator accounts
 * (storyfield_ai_systemadmins table).
 *
 * This operation retrieves a filtered, paginated list of system administrator
 * accounts registered in the system. It supports filtering by email,
 * external_admin_id, actor_type, account creation/update dates, and last login
 * timestamps. Only systemAdmin role users can call this endpoint. Results
 * include all active admins by default (soft-deleted admins excluded unless
 * requested with deleted=true).
 *
 * @param props -
 * @param props.systemAdmin - Authenticated systemAdmin payload
 * @param props.body - Search and filter parameters as
 *   IStoryfieldAiSystemAdmin.IRequest
 * @returns Paginated list of concise admin account summaries
 * @throws {Error} If given invalid pagination values (page < 1, limit > 100)
 */
export async function patchstoryfieldAiSystemAdminSystemAdmins(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiSystemAdmin.IRequest;
}): Promise<IPageIStoryfieldAiSystemAdmin.ISummary> {
  const body = props.body;
  // Validate pagination input
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  if (rawPage < 1) throw new Error("page must be greater than or equal to 1");
  if (rawLimit > 100) throw new Error("limit must be at most 100");
  const page = Number(rawPage);
  const limit = Number(rawLimit);

  // Construct date range filters
  const createdAtRange =
    body.created_from !== undefined || body.created_to !== undefined
      ? {
          ...(body.created_from !== undefined && { gte: body.created_from }),
          ...(body.created_to !== undefined && { lte: body.created_to }),
        }
      : undefined;
  const updatedAtRange =
    body.updated_from !== undefined || body.updated_to !== undefined
      ? {
          ...(body.updated_from !== undefined && { gte: body.updated_from }),
          ...(body.updated_to !== undefined && { lte: body.updated_to }),
        }
      : undefined;
  const lastLoginAtRange =
    body.last_login_from !== undefined || body.last_login_to !== undefined
      ? {
          ...(body.last_login_from !== undefined && {
            gte: body.last_login_from,
          }),
          ...(body.last_login_to !== undefined && { lte: body.last_login_to }),
        }
      : undefined;

  // Build main where clause
  const where = {
    ...(body.email !== undefined && { email: body.email }),
    ...(body.external_admin_id !== undefined && {
      external_admin_id: body.external_admin_id,
    }),
    ...(body.actor_type !== undefined && { actor_type: body.actor_type }),
    ...(createdAtRange !== undefined && { created_at: createdAtRange }),
    ...(updatedAtRange !== undefined && { updated_at: updatedAtRange }),
    ...(lastLoginAtRange !== undefined && { last_login_at: lastLoginAtRange }),
    ...(body.deleted === true ? {} : { deleted_at: null }),
  };

  // Secure sort field selection to prevent invalid column errors
  const validSortFields = [
    "id",
    "email",
    "actor_type",
    "created_at",
    "updated_at",
    "last_login_at",
  ];
  const sortField = validSortFields.includes(body.sort ?? "")
    ? (body.sort ?? "created_at")
    : "created_at";
  const sortOrder: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Query DB for paginated admins
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_systemadmins.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        actor_type: true,
        last_login_at: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.storyfield_ai_systemadmins.count({ where }),
  ]);

  // Map DB records to ISummary DTO type, converting Date → ISO strings
  const data = rows.map((row) => {
    const last_login_at =
      row.last_login_at !== null && row.last_login_at !== undefined
        ? toISOStringSafe(row.last_login_at)
        : null;
    const deleted_at =
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : null;
    return {
      id: row.id,
      email: row.email,
      actor_type: row.actor_type,
      last_login_at: last_login_at === null ? undefined : last_login_at, // ISummary allows undefined|null
      created_at: toISOStringSafe(row.created_at),
      deleted_at: deleted_at === null ? undefined : deleted_at, // ISummary allows undefined|null
    };
  });

  // Pagination result (strip typia tags for Prisma → API assignability)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
