import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuthSession";
import { IPageIHealthcarePlatformAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuthSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search, paginate, and filter authentication sessions from
 * healthcare_platform_auth_sessions.
 *
 * This endpoint retrieves a filtered, paginated list of authentication sessions
 * based on complex search and query parameters. It is accessible only to
 * privileged system administrators, and allows for auditing and operational
 * monitoring of all authentication session records in the platform.
 *
 * @param props - An object containing:
 *
 *   - SystemAdmin: The SystemadminPayload for authorization (must be a system
 *       admin)
 *   - Body: The search/filter and pagination parameters
 *       (IHealthcarePlatformAuthSession.IRequest)
 *
 * @returns Paginated collection of authentication session summary data matching
 *   filter criteria (IPageIHealthcarePlatformAuthSession.ISummary)
 * @throws {Error} If database query fails or required fields are missing.
 */
export async function patchhealthcarePlatformSystemAdminAuthSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAuthSession.IRequest;
}): Promise<IPageIHealthcarePlatformAuthSession.ISummary> {
  const { systemAdmin, body } = props;

  // Authorization is enforced by presence and contract of systemAdmin payload

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sort parsing and normalization
  let sortField: "issued_at" | "expires_at" | "revoked_at" = "issued_at";
  let sortDirection: "asc" | "desc" = "desc";
  if (body.sort) {
    const match = body.sort.match(/^(\-|\+)?([a-zA-Z_]+)(?:\s+(asc|desc))?$/);
    if (match) {
      const [, prefix, field, dir] = match;
      if (
        field === "issued_at" ||
        field === "expires_at" ||
        field === "revoked_at"
      ) {
        sortField = field as typeof sortField;
        sortDirection = prefix === "-" || dir === "desc" ? "desc" : "asc";
      }
    }
  }

  // Build where clause using only defined, supported, non-null fields
  const where: Record<string, unknown> = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.user_type !== undefined &&
      body.user_type !== null && { user_type: body.user_type }),
    ...(body.session_token !== undefined &&
      body.session_token !== null && { session_token: body.session_token }),
    ...(body.refresh_token !== undefined &&
      body.refresh_token !== null && { refresh_token: body.refresh_token }),
    ...(body.user_agent !== undefined &&
      body.user_agent !== null && { user_agent: body.user_agent }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && { ip_address: body.ip_address }),
    ...(body.issued_at_from || body.issued_at_to
      ? {
          issued_at: {
            ...(body.issued_at_from && { gte: body.issued_at_from }),
            ...(body.issued_at_to && { lte: body.issued_at_to }),
          },
        }
      : {}),
    ...(body.expires_at_from || body.expires_at_to
      ? {
          expires_at: {
            ...(body.expires_at_from && { gte: body.expires_at_from }),
            ...(body.expires_at_to && { lte: body.expires_at_to }),
          },
        }
      : {}),
    ...(body.revoked_at_from || body.revoked_at_to
      ? {
          revoked_at: {
            ...(body.revoked_at_from && { gte: body.revoked_at_from }),
            ...(body.revoked_at_to && { lte: body.revoked_at_to }),
          },
        }
      : {}),
  };

  // Query sessions and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_auth_sessions.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_auth_sessions.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      user_type: row.user_type,
      user_id: row.user_id,
      session_token: row.session_token,
      issued_at: toISOStringSafe(row.issued_at),
      expires_at: toISOStringSafe(row.expires_at),
      revoked_at:
        row.revoked_at !== null && row.revoked_at !== undefined
          ? toISOStringSafe(row.revoked_at)
          : undefined,
      deleted_at: undefined, // no deleted_at in schema
      user_agent: row.user_agent ?? undefined,
      ip_address: row.ip_address ?? undefined,
    };
  });

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
