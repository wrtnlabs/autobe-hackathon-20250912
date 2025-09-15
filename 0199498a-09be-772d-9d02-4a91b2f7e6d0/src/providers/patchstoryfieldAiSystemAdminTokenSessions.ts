import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTokenSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenSession";
import { IPageIStoryfieldAiTokenSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTokenSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List and search authentication token sessions (admin only) from
 * storyfield_ai_token_sessions
 *
 * Retrieve a paginated, filtered list of authentication sessions across all
 * users and system administrators. This operation supports complex queries over
 * the storyfield_ai_token_sessions table from the Prisma schema. Administrators
 * can search by user ID, admin ID, issued_at, expires_at, token hash
 * (fingerprint), and session state (active, expired, revoked). All search
 * criteria must correspond to actual fields documented in the schema
 * specification.
 *
 * Only system administrators are permitted to access this endpoint, reflecting
 * the critical role of session monitoring and control for platform security.
 * Returned sessions include both authenticated user- and admin-linked records,
 * as well as session lifecycle details: issued_at, expires_at,
 * last_activity_at, refresh status, deletion (soft), plus fingerprints for
 * device/browser validation.
 *
 * Strong data governance and privacy rules must be applied: token_hash is shown
 * as hashed only, never the actual token value. All session data presented must
 * be audit-safe and traceable for compliance. This operation should support
 * admin troubleshooting of login problems, forced logout, or abuse
 * detection—never for business-user-level session viewing.
 *
 * @param props - Properties including the authenticated system administrator
 *   and filtering/pagination criteria
 * @param props.systemAdmin - The authenticated system admin executing this
 *   operation
 * @param props.body - Complex filter, pagination, and search criteria for
 *   session records
 * @returns Paginated list of token session summary records matching query
 * @throws {Error} If page or limit values are out of range or database errors
 *   occur
 */
export async function patchstoryfieldAiSystemAdminTokenSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiTokenSession.IRequest;
}): Promise<IPageIStoryfieldAiTokenSession.ISummary> {
  const { body } = props;

  // Compute page and limit (default page=1, limit=20) and strip to plain number
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? body.limit : 20;
  // Do not allow page less than 1
  if (page < 1) {
    throw new Error("Page must be >= 1");
  }
  // Do not allow limit less than 1
  if (limit < 1) {
    throw new Error("Limit must be >= 1");
  }
  const skip = (page - 1) * limit;

  // Dynamically build range objects (each may be undefined)
  const issuedAt: { gte?: string; lte?: string } = {};
  if (body.issued_at_min !== undefined) issuedAt.gte = body.issued_at_min;
  if (body.issued_at_max !== undefined) issuedAt.lte = body.issued_at_max;
  const issuedAtHasFilters = Object.keys(issuedAt).length > 0;

  const expiresAt: { gte?: string; lte?: string } = {};
  if (body.expires_at_min !== undefined) expiresAt.gte = body.expires_at_min;
  if (body.expires_at_max !== undefined) expiresAt.lte = body.expires_at_max;
  const expiresAtHasFilters = Object.keys(expiresAt).length > 0;

  const lastActivityAt: { gte?: string; lte?: string } = {};
  if (body.last_activity_at_min !== undefined)
    lastActivityAt.gte = body.last_activity_at_min;
  if (body.last_activity_at_max !== undefined)
    lastActivityAt.lte = body.last_activity_at_max;
  const lastActivityAtHasFilters = Object.keys(lastActivityAt).length > 0;

  // Build Prisma where clause with all supported filters
  const where = {
    ...(body.authenticated_user_id !== undefined &&
      body.authenticated_user_id !== null && {
        authenticated_user_id: body.authenticated_user_id,
      }),
    ...(body.system_admin_id !== undefined &&
      body.system_admin_id !== null && {
        system_admin_id: body.system_admin_id,
      }),
    ...(body.fingerprint !== undefined &&
      body.fingerprint !== null && {
        fingerprint: body.fingerprint,
      }),
    ...(issuedAtHasFilters && { issued_at: { ...issuedAt } }),
    ...(expiresAtHasFilters && { expires_at: { ...expiresAt } }),
    ...(lastActivityAtHasFilters && {
      last_activity_at: { ...lastActivityAt },
    }),
  };

  // Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_token_sessions.findMany({
      where,
      orderBy: { issued_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.storyfield_ai_token_sessions.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    authenticated_user_id: row.authenticated_user_id ?? null,
    system_admin_id: row.system_admin_id ?? null,
    fingerprint: row.fingerprint,
    issued_at: toISOStringSafe(row.issued_at),
    expires_at: toISOStringSafe(row.expires_at),
    last_activity_at: toISOStringSafe(row.last_activity_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
