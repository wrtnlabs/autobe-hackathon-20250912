import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Permanently delete a Department Manager user identified by
 * departmentmanagerId.
 *
 * This operation performs a hard delete removing the record from the database
 * entirely, ignoring any soft delete fields like deleted_at.
 *
 * Only users with the 'departmentManager' role may perform this action.
 *
 * @param props - Object containing the authenticated departmentManager payload
 *   and the departmentmanagerId to delete
 * @param props.departmentManager - Authenticated Department Manager performing
 *   the deletion
 * @param props.departmentmanagerId - UUID of the Department Manager to be
 *   deleted
 * @throws {Error} Throws if the Department Manager does not exist
 */
export async function deleteenterpriseLmsDepartmentManagerDepartmentmanagersDepartmentmanagerId(props: {
  departmentManager: DepartmentmanagerPayload;
  departmentmanagerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentManager, departmentmanagerId } = props;

  // Verify the Department Manager exists before deleting
  await MyGlobal.prisma.enterprise_lms_departmentmanager.findUniqueOrThrow({
    where: { id: departmentmanagerId },
  });

  // Hard delete the Department Manager record
  await MyGlobal.prisma.enterprise_lms_departmentmanager.delete({
    where: { id: departmentmanagerId },
  });
}
