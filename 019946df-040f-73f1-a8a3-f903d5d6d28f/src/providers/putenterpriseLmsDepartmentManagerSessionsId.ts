import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Update an active LMS user session for a department manager.
 *
 * This operation updates an existing user session identified by the session ID.
 * It checks that the tenant and user in the session correspond to those in the
 * update data. Only authorized users matching the session may modify the
 * session.
 *
 * @param props - Object containing the department manager, session ID, and
 *   update data
 * @param props.departmentManager - Authenticated department manager payload
 * @param props.id - UUID of the session to update
 * @param props.body - Update data for the session
 * @returns Updated session information conforming to IEnterpriseLmsSessions
 * @throws {Error} - Throws if the session is not found or unauthorized
 */
export async function putenterpriseLmsDepartmentManagerSessionsId(props: {
  departmentManager: DepartmentmanagerPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsSessions.IUpdate;
}): Promise<IEnterpriseLmsSessions> {
  const { departmentManager, id, body } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
      where: { id },
    });

  if (session.enterprise_lms_tenant_id !== body.enterprise_lms_tenant_id) {
    throw new Error("Unauthorized: Tenant ID mismatch");
  }

  if (session.user_id !== body.user_id) {
    throw new Error("Unauthorized: User ID mismatch");
  }

  const updated = await MyGlobal.prisma.enterprise_lms_sessions.update({
    where: { id },
    data: {
      enterprise_lms_tenant_id: body.enterprise_lms_tenant_id,
      user_id: body.user_id,
      session_token: body.session_token,
      ip_address: body.ip_address ?? undefined,
      device_info: body.device_info ?? undefined,
      created_at: body.created_at
        ? toISOStringSafe(body.created_at)
        : undefined,
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : undefined,
      expires_at: toISOStringSafe(body.expires_at),
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
