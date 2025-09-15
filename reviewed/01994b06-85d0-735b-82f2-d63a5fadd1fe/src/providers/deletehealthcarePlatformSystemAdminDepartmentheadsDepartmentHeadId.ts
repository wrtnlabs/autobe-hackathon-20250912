import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a Department Head by unique identifier (hard delete).
 *
 * This operation allows privileged system administrators to irreversibly remove
 * a Department Head from the healthcare platform. The action targets the
 * 'healthcare_platform_departmentheads' table; hard deletion is enforced per
 * business and compliance requirements, regardless of soft-delete field
 * presence.
 *
 * Authorization: Only System Admins are allowed to execute this operation. The
 * authenticated user's payload is strictly required.
 *
 * - Checks authorization for system admin role.
 * - Checks for existence of the department head before deletion.
 * - Performs hard delete (physical removal).
 * - Throws errors with meaningful API messages if not found or not authorized.
 *
 * Note: The related business logic requires audit logging for such deletions.
 * This function assumes audit side effects are handled elsewhere (middleware,
 * triggers, or service layers).
 *
 * @param props - Object containing the required deletion parameters
 * @param props.systemAdmin - The authenticated System Admin performing the
 *   deletion
 * @param props.departmentHeadId - The UUID of the Department Head to delete
 * @returns Void (no content)
 * @throws {Error} If not authorized or if the Department Head does not exist
 */
export async function deletehealthcarePlatformSystemAdminDepartmentheadsDepartmentHeadId(props: {
  systemAdmin: SystemadminPayload;
  departmentHeadId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (!props.systemAdmin || props.systemAdmin.type !== "systemAdmin") {
    throw new Error(
      "Unauthorized: Only System Admins may delete department heads",
    );
  }
  const departmentHead =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findUnique({
      where: { id: props.departmentHeadId },
    });
  if (!departmentHead) {
    throw new Error("Department Head not found");
  }
  await MyGlobal.prisma.healthcare_platform_departmentheads.delete({
    where: { id: props.departmentHeadId },
  });
}
