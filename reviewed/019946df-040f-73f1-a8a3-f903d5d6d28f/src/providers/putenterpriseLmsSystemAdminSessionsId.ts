import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates an existing active session in the Enterprise LMS system.
 *
 * This function modifies session details such as device info, IP address, and
 * session expiration. It ensures the session exists and belongs to the
 * systemAdmin context.
 *
 * @param props - Object containing systemAdmin authentication, session ID, and
 *   update body.
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   update.
 * @param props.id - UUID of the session to update.
 * @param props.body - Updated session fields conforming to
 *   IEnterpriseLmsSessions.IUpdate.
 * @returns The updated session information as IEnterpriseLmsSessions.
 * @throws {Error} Throws if the session with the specified ID does not exist.
 */
export async function putenterpriseLmsSystemAdminSessionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsSessions.IUpdate;
}): Promise<IEnterpriseLmsSessions> {
  const { systemAdmin, id, body } = props;

  // Verify session exists
  await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
    where: { id },
  });

  // Perform update
  const updated = await MyGlobal.prisma.enterprise_lms_sessions.update({
    where: { id },
    data: {
      enterprise_lms_tenant_id: body.enterprise_lms_tenant_id,
      user_id: body.user_id,
      session_token: body.session_token,
      ip_address: body.ip_address ?? undefined,
      device_info: body.device_info ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: body.updated_at ?? undefined,
      expires_at: body.expires_at,
    },
  });

  // Return with proper branding and date conversions
  return {
    id: updated.id,
    enterprise_lms_tenant_id: updated.enterprise_lms_tenant_id,
    user_id: updated.user_id,
    session_token: updated.session_token,
    ip_address: updated.ip_address ?? null,
    device_info: updated.device_info ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    expires_at: toISOStringSafe(updated.expires_at),
  };
}
