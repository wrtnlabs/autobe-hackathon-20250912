import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedusers";
import { IPageIStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiAuthenticatedusers";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve and search a paginated list of authenticated users
 * (storyfield_ai_authenticatedusers).
 *
 * This provider lists registered, verified authenticated users in the
 * StoryField AI service, allowing filtering, searching, and paging on all
 * essential onboarding and compliance data. Supports filtering by email,
 * external user ID, actor_type, creation and update date, and soft-deletion
 * status. Only system admins may access this operation. All result dates are
 * returned as ISO 8601 strings with correct format branding. Sorting supports
 * allowed fields only.
 *
 * @param props - Properties for call
 * @param props.systemAdmin - The authenticated system admin making this request
 * @param props.body - Search, filter, sort, and pagination options (see
 *   IStoryfieldAiAuthenticatedusers.IRequest)
 * @returns Paginated summary listing of authenticated users (ISummary)
 * @throws {Error} If not called by a valid system admin, or if sort/order field
 *   is not allowed
 */
export async function patchstoryfieldAiSystemAdminAuthenticatedUsers(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiAuthenticatedusers.IRequest;
}): Promise<IPageIStoryfieldAiAuthenticatedusers.ISummary> {
  const { systemAdmin, body } = props;

  // Authorization check: only systemAdmin.type === 'systemAdmin' allowed
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error(
      "Unauthorized: Only system admin may list authenticated users",
    );
  }

  // Allowed sort fields for defensive sorting (all ISummary keys except deleted_at, which is optional)
  const ALLOWED_SORT_FIELDS = [
    "id",
    "external_user_id",
    "email",
    "created_at",
    "updated_at",
  ];

  const DEFAULT_SORT_FIELD = "created_at";
  const DEFAULT_SORT_ORDER = "desc";

  // Parse pagination params with defaults enforced, using Number to strip typia tags
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  // Defensive: If sort given, only allow whitelisted fields, else default
  const sortField =
    body.sort !== undefined && ALLOWED_SORT_FIELDS.includes(body.sort)
      ? body.sort
      : DEFAULT_SORT_FIELD;
  // Defensive: Only allow 'asc'/'desc', else default
  const sortOrder =
    body.order === "asc" || body.order === "desc"
      ? body.order
      : DEFAULT_SORT_ORDER;

  // Build Prisma where clause (inline, immutable)
  const where = {
    ...(body.email !== undefined && { email: body.email }),
    ...(body.external_user_id !== undefined && {
      external_user_id: body.external_user_id,
    }),
    ...(body.actor_type !== undefined && { actor_type: body.actor_type }),
    // Date ranges: created_at
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    // Date ranges: updated_at
    ...(body.updated_from !== undefined || body.updated_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_from !== undefined && { gte: body.updated_from }),
            ...(body.updated_to !== undefined && { lte: body.updated_to }),
          },
        }
      : {}),
    // Soft delete filter
    ...(typeof body.deleted === "boolean"
      ? body.deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : { deleted_at: null }),
  };

  // Query rows and count in parallel (immutable, no intermediate variables)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_authenticatedusers.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_authenticatedusers.count({ where }),
  ]);

  // Map to ISummary, converting dates to branded strings
  const data = rows.map((row) => ({
    id: row.id,
    external_user_id: row.external_user_id,
    email: row.email,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Build response per IPageIStoryfieldAiAuthenticatedusers.ISummary
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
