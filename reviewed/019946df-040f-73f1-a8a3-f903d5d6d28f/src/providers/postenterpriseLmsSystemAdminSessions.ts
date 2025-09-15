import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new user session capturing tenant, user, session token, device
 * information, IP address, and expiration timestamps.
 *
 * This operation is restricted to system administrators.
 *
 * @param props - Object containing systemAdmin payload and session creation
 *   data.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.body - The session creation data.
 * @returns The newly created session record including timestamps.
 * @throws {Error} Throws if session creation fails due to conflicts or invalid
 *   input.
 */
export async function postenterpriseLmsSystemAdminSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSession.ICreate;
}): Promise<IEnterpriseLmsSession> {
  const { systemAdmin, body } = props;

  const created = await MyGlobal.prisma.enterprise_lms_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      enterprise_lms_tenant_id: body.enterprise_lms_tenant_id,
      user_id: body.user_id,
      session_token: body.session_token,
      ip_address: body.ip_address ?? null,
      device_info: body.device_info ?? null,
      created_at: body.created_at,
      updated_at: body.updated_at,
      expires_at: body.expires_at,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    enterprise_lms_tenant_id: created.enterprise_lms_tenant_id as string &
      tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    session_token: created.session_token,
    ip_address: created.ip_address ?? null,
    device_info: created.device_info ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    expires_at: toISOStringSafe(created.expires_at),
  };
}
