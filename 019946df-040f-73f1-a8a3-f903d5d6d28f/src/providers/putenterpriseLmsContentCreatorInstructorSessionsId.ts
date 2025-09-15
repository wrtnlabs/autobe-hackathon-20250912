import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing LMS user session with new information
 *
 * This operation updates an existing active session belonging to a tenant and
 * user in the enterprise learning management system. It modifies session
 * details such as device info and IP address, and updates session expiration.
 *
 * @param props - Object containing the authenticated content creator
 *   instructor, session ID, and update data
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor payload
 * @param props.id - UUID of the session to update
 * @param props.body - Session update data conforming to
 *   IEnterpriseLmsSessions.IUpdate
 * @returns The updated session data conforming to IEnterpriseLmsSessions
 * @throws {Error} When the session is not found
 * @throws {Error} When the authenticated user is not authorized to update the
 *   session
 */
export async function putenterpriseLmsContentCreatorInstructorSessionsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsSessions.IUpdate;
}): Promise<IEnterpriseLmsSessions> {
  const { contentCreatorInstructor, id, body } = props;

  const session = await MyGlobal.prisma.enterprise_lms_sessions.findUnique({
    where: { id },
  });

  if (!session) throw new Error("Session not found");

  if (session.user_id !== contentCreatorInstructor.id) {
    throw new Error("Unauthorized: You can only update your own sessions");
  }

  const updated = await MyGlobal.prisma.enterprise_lms_sessions.update({
    where: { id },
    data: {
      enterprise_lms_tenant_id: body.enterprise_lms_tenant_id,
      user_id: body.user_id,
      session_token: body.session_token,
      ip_address: body.ip_address ?? null,
      device_info: body.device_info ?? null,
      created_at: body.created_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
      expires_at: body.expires_at,
    },
  });

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
