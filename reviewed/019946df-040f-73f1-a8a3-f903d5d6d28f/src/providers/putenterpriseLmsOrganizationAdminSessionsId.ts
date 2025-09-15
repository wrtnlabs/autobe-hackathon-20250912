import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing LMS user session with new information.
 *
 * This operation updates a session identified by ID, verifying tenant
 * authorization. Updates session token, device info, IP address, expiration,
 * and timestamps.
 *
 * @param props - Object containing authorized admin, session ID, and update
 *   data
 * @returns The updated session data
 * @throws {Error} Throws "Unauthorized" if tenant ID mismatch
 * @throws {Error} Throws if session ID not found
 */
export async function putenterpriseLmsOrganizationAdminSessionsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsSessions.IUpdate;
}): Promise<IEnterpriseLmsSessions> {
  const { organizationAdmin, id, body } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
      where: { id },
    });

  if (session.enterprise_lms_tenant_id !== organizationAdmin.tenant_id) {
    throw new Error("Unauthorized");
  }

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

  return {
    id: updated.id as string & tags.Format<"uuid">,
    enterprise_lms_tenant_id: updated.enterprise_lms_tenant_id as string &
      tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    session_token: updated.session_token,
    ip_address: updated.ip_address ?? null,
    device_info: updated.device_info ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    expires_at: toISOStringSafe(updated.expires_at),
  };
}
