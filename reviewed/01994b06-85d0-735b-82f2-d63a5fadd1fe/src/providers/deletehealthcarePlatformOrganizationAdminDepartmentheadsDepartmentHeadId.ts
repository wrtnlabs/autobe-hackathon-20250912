import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a Department Head by ID (table:
 * healthcare_platform_departmentheads)
 *
 * This operation allows privileged administrators (organizationAdmin) to
 * permanently remove a Department Head from the healthcare platform system. The
 * function performs a hard delete (irreversible) from the
 * 'healthcare_platform_departmentheads' table using the specified unique
 * identifier. If the target record does not exist, a meaningful error is
 * thrown. Authorization is enforced via the organizationAdmin parameter. All
 * deletions are expected to be externally audited per organizational compliance
 * policy.
 *
 * @param props - Object containing: organizationAdmin: The authenticated
 *   OrganizationadminPayload performing the deletion departmentHeadId: Unique
 *   identifier (UUID) of the Department Head to delete
 * @returns Void (no content is returned on successful deletion)
 * @throws {Error} If the Department Head does not exist
 */
export async function deletehealthcarePlatformOrganizationAdminDepartmentheadsDepartmentHeadId(props: {
  organizationAdmin: OrganizationadminPayload;
  departmentHeadId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure the Department Head exists before attempting to delete
  const departmentHead =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findUnique({
      where: { id: props.departmentHeadId },
    });
  if (!departmentHead) {
    throw new Error("Department Head not found");
  }
  // Hard delete: permanently remove the Department Head record
  await MyGlobal.prisma.healthcare_platform_departmentheads.delete({
    where: { id: props.departmentHeadId },
  });
  // Auditing should be performed externally per organizational policy
}
