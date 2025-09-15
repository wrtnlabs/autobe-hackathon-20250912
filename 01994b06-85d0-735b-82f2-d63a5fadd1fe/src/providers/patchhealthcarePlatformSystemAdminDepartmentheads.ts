import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { IPageIHealthcarePlatformDepartmenthead } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDepartmenthead";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list department heads (healthcare_platform_departmentheads), with
 * pagination and filters
 *
 * This endpoint retrieves a paginated, filterable list of department head users
 * in the healthcarePlatform system. Results may be filtered by partial name,
 * email, activation status, and created date range. System administrators
 * invoke this operation to conduct staff searches, compliance audits, or role
 * assignment workflows. All returned records contain department head summary
 * fields, respecting soft deletion marker for filtering (is_active).
 *
 * Only authenticated system administrators may use this endpoint. All searches
 * are subject to compliance audit and may be recorded for traceability.
 *
 * @param props - Properties including authentication payload and the
 *   search/filter body.
 * @param props.systemAdmin - The authenticated SystemadminPayload (must be a
 *   valid, active system admin).
 * @param props.body - Request body containing filter/search criteria (partial
 *   name/email, time window, pagination, and sorting instructions).
 * @returns Paginated search result with department head summaries, each field
 *   typed and formatted per API contract.
 * @throws {Error} If authentication fails or database errors occur.
 */
export async function patchhealthcarePlatformSystemAdminDepartmentheads(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDepartmentHead.IRequest;
}): Promise<IPageIHealthcarePlatformDepartmenthead> {
  const { body } = props;

  // Defaults and allowed values
  const defaultPage = 1;
  const defaultLimit = 20;
  const minLimit = 1;
  const maxLimit = 100;
  const allowedSortFields = ["created_at", "full_name", "email"];

  // Normalize and enforce sort field and order
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? (body.sort ?? "created_at")
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";
  const page = Math.max(Number(body.page ?? defaultPage), 1);
  const limit = Math.min(
    Math.max(Number(body.limit ?? defaultLimit), minLimit),
    maxLimit,
  );
  const skip = (page - 1) * limit;

  // Build where filter
  const where: Record<string, any> = {};
  if (
    body.full_name !== undefined &&
    body.full_name !== null &&
    body.full_name.length > 0
  ) {
    where.full_name = {
      contains: body.full_name,
    };
  }
  if (
    body.email !== undefined &&
    body.email !== null &&
    body.email.length > 0
  ) {
    where.email = {
      contains: body.email,
    };
  }
  if (body.is_active === true) {
    where.deleted_at = null;
  }
  if (body.is_active === false) {
    where.deleted_at = { not: null };
  }
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    where.created_at = {};
    if (body.created_from !== undefined && body.created_from !== null) {
      where.created_at.gte = body.created_from;
    }
    if (body.created_to !== undefined && body.created_to !== null) {
      where.created_at.lte = body.created_to;
    }
  }

  // Query department heads in parallel: list with pagination and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_departmentheads.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_departmentheads.count({ where }),
  ]);

  // Format data according to API contract and type rules
  const data = rows.map((row) => {
    // phone is optional + nullable (DTO: phone?: string | null | undefined)
    const phone = row.phone === null ? null : (row.phone ?? undefined);
    // deleted_at is optional + nullable (DTO: deleted_at?: string & tags.Format<'date-time'> | null | undefined)
    const deleted_at =
      row.deleted_at === undefined
        ? undefined
        : row.deleted_at === null
          ? null
          : toISOStringSafe(row.deleted_at);
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      phone,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      ...(deleted_at !== undefined && { deleted_at }),
    };
  });

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
