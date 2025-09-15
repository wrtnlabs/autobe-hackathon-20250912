import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthAuditLog";
import { IPageIStoryfieldAiAuthAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiAuthAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated authentication/authorization audit events
 * (systemAdmin only; storyfield_ai_auth_audit_logs)
 *
 * This operation allows system administrators to retrieve a paginated,
 * filterable summary list of authentication and authorization audit log events
 * from the storyfield_ai_auth_audit_logs table. Supports flexible search by
 * event type, outcome, involved user/admin/session ID, time range, and textual
 * meta fields. Results include audit events strictly for non-deleted records,
 * sorted by most recent event. Pagination is enforced with page and limit
 * controls, with reasonable max per page.
 *
 * Authorization is strictly limited to systemAdmin role (validated by
 * props.systemAdmin). Query errors, including bad filter syntax and
 * unauthorized access, result in clear exceptions. Returned data is always in
 * summary format — full audit log may be accessed via detail endpoint if
 * available.
 *
 * @param props - Provider input containing systemAdmin context and filter body
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.body - Audit query, filter, and paging criteria
 *   (IStoryfieldAiAuthAuditLog.IRequest)
 * @returns Paged, filtered summary list of audit log events with precise
 *   pagination
 * @throws {Error} If not authorized or if query/argument validation fails
 */
export async function patchstoryfieldAiSystemAdminAuthAuditLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiAuthAuditLog.IRequest;
}): Promise<IPageIStoryfieldAiAuthAuditLog.ISummary> {
  const { systemAdmin, body } = props;

  // Enforce systemAdmin authorization (already checked by controller/decorator)
  // Defensive programming: validate systemAdmin.id is present
  if (!systemAdmin || !systemAdmin.id) {
    throw new Error("Access denied: Only system admins can query audit logs");
  }

  // Paging logic: defaults and caps
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0 ? (body.limit > 100 ? 100 : body.limit) : 20;

  // Build main where clause using only non-undefined, non-null values
  const where = {
    deleted_at: null,
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...(body.event_outcome !== undefined &&
      body.event_outcome !== null && { event_outcome: body.event_outcome }),
    ...(body.authenticated_user_id !== undefined &&
      body.authenticated_user_id !== null && {
        authenticated_user_id: body.authenticated_user_id,
      }),
    ...(body.system_admin_id !== undefined &&
      body.system_admin_id !== null && {
        system_admin_id: body.system_admin_id,
      }),
    ...(body.token_session_id !== undefined &&
      body.token_session_id !== null && {
        token_session_id: body.token_session_id,
      }),
    ...(body.user_agent !== undefined &&
      body.user_agent !== null && {
        user_agent: { contains: body.user_agent },
      }),
    ...(body.source_ip !== undefined &&
      body.source_ip !== null && { source_ip: { contains: body.source_ip } }),
    ...(body.event_message !== undefined &&
      body.event_message !== null && {
        event_message: { contains: body.event_message },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Fetch paged audit events and total records concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_auth_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_auth_audit_logs.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    token_session_id: row.token_session_id ?? null,
    authenticated_user_id: row.authenticated_user_id ?? null,
    system_admin_id: row.system_admin_id ?? null,
    event_type: row.event_type,
    event_outcome: row.event_outcome,
    event_message: row.event_message ?? null,
    source_ip: row.source_ip ?? null,
    user_agent: row.user_agent ?? null,
    created_at: toISOStringSafe(row.created_at),
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
