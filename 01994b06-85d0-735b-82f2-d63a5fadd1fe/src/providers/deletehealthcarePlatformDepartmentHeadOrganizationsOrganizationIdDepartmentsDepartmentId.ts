import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Soft-delete (logical removal) of a department within a specific organization
 * by a department head.
 *
 * This operation sets the 'deleted_at' timestamp for the
 * healthcare_platform_departments record to perform a soft delete, preserving
 * the record for audit/compliance purposes. This is performed only if the
 * department exists, belongs to the specified organization, and is not already
 * deleted.
 *
 * Authorization: The provided department head must be authenticated, but
 * assignment validation is not possible given the schema. This logic only
 * enforces that the department exists in the specified org and is active.
 *
 * Any attempt to delete a department that does not exist or is already deleted
 * will result in an error. Additional business constraints like legal hold,
 * audit lock, or active assignment blocking soft-delete are not enforced here,
 * as their representation is not present in the provided schema context. (Would
 * require extension for such rules.)
 *
 * @param props - Parameters including the authenticated department head, target
 *   organization, and department id
 * @param props.departmentHead - The authenticated department head user
 *   (payload, already validated by guard)
 * @param props.organizationId - The target organization to which the department
 *   belongs
 * @param props.departmentId - The id of the department within the above
 *   organization to delete
 * @returns Void (throws on error)
 * @throws {Error} When the department does not exist, does not belong to the
 *   organization, or has already been deleted
 */
export async function deletehealthcarePlatformDepartmentHeadOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  departmentHead: DepartmentheadPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, organizationId, departmentId } = props;

  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: departmentId,
        healthcare_platform_organization_id: organizationId,
      },
    });
  if (!department) {
    throw new Error("Department not found");
  }
  if (department.deleted_at !== null) {
    throw new Error("Department has already been deleted");
  }
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_departments.update({
    where: { id: departmentId },
    data: { deleted_at: deletedAt },
  });
}
