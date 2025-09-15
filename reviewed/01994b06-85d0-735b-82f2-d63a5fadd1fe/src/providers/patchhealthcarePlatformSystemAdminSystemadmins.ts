import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import { IPageIHealthcarePlatformSystemadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformSystemadmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of system administrators
 * (healthcare_platform_systemadmins)
 *
 * Retrieves all platform admin accounts with advanced search, filtering,
 * sorting, and pagination. Only users with privileged systemAdmin rights can
 * access this endpoint; sensitive credential fields are omitted. Status field
 * is derived for compliance: "active" (deleted_at is null) or "deleted"
 * (deleted_at is not null).
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: Authenticated system admin payload (must have type
 *       "systemAdmin")
 *   - Body: Search criteria and pagination for admin listing
 *
 * @returns List and pagination meta for summary admin info
 * @throws {Error} When not authorized, or on invalid page/limit values
 */
export async function patchhealthcarePlatformSystemAdminSystemadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformSystemAdmin.IRequest;
}): Promise<IPageIHealthcarePlatformSystemadmin.ISummary> {
  const { systemAdmin, body } = props;
  // Authorization: Only systemAdmin type
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized: Must be system admin.");
  }
  // Pagination parse and enforce
  let page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (page < 1 || limit < 1 || limit > 100) {
    throw new Error("Invalid page or limit; page must be >=1, limit 1-100");
  }
  const skip = (page - 1) * limit;
  // Build filters
  const where: Record<string, unknown> = {};
  if (body.email !== undefined) {
    where.email = { contains: body.email };
  }
  if (body.full_name !== undefined) {
    where.full_name = { contains: body.full_name };
  }
  if (body.created_at_gte !== undefined) {
    where.created_at = where.created_at ?? {};
    (where.created_at as Record<string, unknown>).gte = body.created_at_gte;
  }
  if (body.created_at_lte !== undefined) {
    where.created_at = where.created_at ?? {};
    (where.created_at as Record<string, unknown>).lte = body.created_at_lte;
  }
  if (body.status === "active") {
    where.deleted_at = null;
  } else if (body.status === "deleted") {
    where.deleted_at = { not: null };
  }
  // Sort: allow only created_at/updated_at
  const allowedSort: Record<string, boolean> = {
    created_at: true,
    updated_at: true,
  };
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const parts = body.sort.split(":");
    const field = parts[0];
    const direction = parts[1] === "asc" ? "asc" : "desc";
    if (allowedSort[field]) {
      orderBy = { [field]: direction };
    }
  }
  // Query DB
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_systemadmins.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        full_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_systemadmins.count({ where }),
  ]);
  // Map to ISummary output, convert all dates
  const data = rows.map((row) => {
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      status: row.deleted_at == null ? "active" : "deleted",
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });
  // Pagination branding (remove/avoid assertions): use Number() to strip branding per IPage docs
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
