import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Soft delete an enrollment by ID in the Enterprise LMS.
 *
 * This function marks the enrollment as deleted by setting the deleted_at
 * timestamp. It ensures data retention compliance by performing a soft delete
 * rather than a hard delete.
 *
 * WARNING: The current implementation does NOT verify tenant ownership or
 * authorization beyond the departmentManager role presence. Proper tenant
 * isolation should be enforced upstream or with extended payload data.
 *
 * @param props - Object containing departmentManager info and enrollment ID
 * @param props.departmentManager - The authenticated departmentManager payload
 * @param props.id - The UUID of the enrollment to soft delete
 * @throws {Error} When the enrollment does not exist
 */
export async function deleteenterpriseLmsDepartmentManagerEnrollmentsId(props: {
  departmentManager: DepartmentmanagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  // Find the enrollment by ID or throw if not found
  await MyGlobal.prisma.enterprise_lms_enrollments.findUniqueOrThrow({
    where: { id },
  });

  // Prepare the ISO string for deleted_at timestamp
  const deleted_at = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at
  await MyGlobal.prisma.enterprise_lms_enrollments.update({
    where: { id },
    data: { deleted_at },
  });
}
