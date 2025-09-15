import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSession";
import { IPageIEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve filtered and paginated list of user sessions
 *
 * This operation returns a paginated list of user sessions filtered by optional
 * user ID and tenant ID. It supports sorting by creation timestamp descending,
 * and includes session token, client IP, device info, creation, and expiry
 * timestamps. Only authorized system administrators should call this function.
 *
 * @param props - Object containing systemAdmin authentication info and request
 *   body with filters
 * @returns Paginated summary of user sessions
 * @throws {Error} When unexpected database or system errors occur
 */
export async function patchenterpriseLmsSystemAdminSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSession.IRequest;
}): Promise<IPageIEnterpriseLmsSession.ISummary> {
  const { systemAdmin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: {
    user_id?: string & tags.Format<"uuid">;
    enterprise_lms_tenant_id?: string & tags.Format<"uuid">;
  } = {};

  if (body.user_id !== undefined && body.user_id !== null) {
    where.user_id = body.user_id;
  }

  if (
    body.enterprise_lms_tenant_id !== undefined &&
    body.enterprise_lms_tenant_id !== null
  ) {
    where.enterprise_lms_tenant_id = body.enterprise_lms_tenant_id;
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_sessions.findMany({
      where,
      select: {
        session_token: true,
        ip_address: true,
        device_info: true,
        created_at: true,
        expires_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_sessions.count({ where }),
  ]);

  const data = sessions.map((s) => ({
    session_token: s.session_token,
    ip_address: s.ip_address ?? null,
    device_info: s.device_info ?? null,
    created_at: toISOStringSafe(s.created_at),
    expires_at: toISOStringSafe(s.expires_at),
  }));

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
