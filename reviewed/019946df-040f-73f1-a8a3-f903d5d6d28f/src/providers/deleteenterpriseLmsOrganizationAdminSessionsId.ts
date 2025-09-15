import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Erase a LMS user session permanently
 *
 * This operation deletes a session record by its unique identifier from the
 * database. It performs a hard delete, invalidating the user's session and
 * revoking access.
 *
 * Only authenticated organization admins are allowed to perform this operation.
 *
 * @param props - Object containing organizationAdmin payload and session id
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.id - UUID string identifying the session to delete
 * @throws {Error} If the session is not found (404)
 * @throws {Error} If the organization admin is unauthorized to delete the
 *   session (403)
 */
export async function deleteenterpriseLmsOrganizationAdminSessionsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, id } = props;

  const session =
    await MyGlobal.prisma.enterprise_lms_sessions.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        enterprise_lms_tenant_id: true,
      },
    });

  if (session.enterprise_lms_tenant_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: OrganizationAdmin can only delete sessions within their tenant",
    );
  }

  await MyGlobal.prisma.enterprise_lms_sessions.delete({ where: { id } });
}
