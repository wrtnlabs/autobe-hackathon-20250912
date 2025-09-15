import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed user session information by session ID
 *
 * This API operation retrieves comprehensive session details from the
 * 'enterprise_lms_sessions' table by the supplied UUID. It returns all session
 * metadata including tenant and user IDs, session token, client IP address,
 * device info, and timestamps in ISO 8601 date-time string format.
 *
 * Access is restricted to authenticated system administrators, enforced
 * externally.
 *
 * @param props - Object containing the authenticated system administrator and
 *   the session ID to retrieve.
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - UUID of the session to retrieve
 * @returns Detailed session information conforming to IEnterpriseLmsSession
 * @throws {Error} Throws if the session ID does not exist
 */
export async function getenterpriseLmsSystemAdminSessionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsSession> {
  const session =
    await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
      where: { id: props.id },
    });

  return {
    id: session.id as string & tags.Format<"uuid">,
    enterprise_lms_tenant_id: session.enterprise_lms_tenant_id as string &
      tags.Format<"uuid">,
    user_id: session.user_id as string & tags.Format<"uuid">,
    session_token: session.session_token,
    ip_address: session.ip_address ?? undefined,
    device_info: session.device_info ?? undefined,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    expires_at: toISOStringSafe(session.expires_at),
  };
}
