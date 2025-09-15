import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Permanently deletes a user session by its unique identifier.
 *
 * This operation removes the session record from the database without soft
 * deletion, effectively revoking user access. Authorization is enforced by
 * matching the session's tenant with the authenticated department manager's
 * tenant.
 *
 * @param props - Object containing the department manager payload and the
 *   session ID to delete
 * @param props.departmentManager - Authenticated department manager information
 * @param props.id - UUID of the session to delete
 * @returns Void
 * @throws {Error} Throws if the department manager is not active, not found, or
 *   unauthorized
 * @throws {Error} Throws if the session does not exist
 */
export async function deleteenterpriseLmsDepartmentManagerSessionsId(props: {
  departmentManager: DepartmentmanagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentManager, id } = props;

  const manager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: { id: departmentManager.id },
    });

  if (!manager || manager.deleted_at !== null || manager.status !== "active") {
    throw new Error("Unauthorized: Department manager not active or not found");
  }

  const session = await MyGlobal.prisma.enterprise_lms_sessions.findUnique({
    where: { id },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.enterprise_lms_tenant_id !== manager.tenant_id) {
    throw new Error("Unauthorized: Session does not belong to your tenant");
  }

  await MyGlobal.prisma.enterprise_lms_sessions.delete({ where: { id } });
}
