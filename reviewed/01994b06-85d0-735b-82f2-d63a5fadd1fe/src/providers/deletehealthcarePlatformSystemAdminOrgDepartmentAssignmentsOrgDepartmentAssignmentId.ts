import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete an organization-to-department assignment
 * (healthcare_platform_org_department_assignments).
 *
 * This operation allows a system administrator to hard delete an existing
 * organization-department assignment, severing the relationship between the
 * specified organization and department. Only active (not soft-deleted)
 * assignments can be deleted. If the assignment does not exist or is already
 * soft-deleted, an error is thrown. This action is destructive and should only
 * be performed by users with full systemAdmin privileges.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.orgDepartmentAssignmentId - The unique identifier of the
 *   assignment to delete
 * @returns Void
 * @throws {Error} If the assignment does not exist or is already soft-deleted
 */
export async function deletehealthcarePlatformSystemAdminOrgDepartmentAssignmentsOrgDepartmentAssignmentId(props: {
  systemAdmin: SystemadminPayload;
  orgDepartmentAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch by id
  const assignment =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: {
          id: props.orgDepartmentAssignmentId,
        },
      },
    );
  // Step 2: Check exists and not soft-deleted
  if (!assignment || assignment.deleted_at !== null) {
    throw new Error(
      "Organization-department assignment not found or already deleted",
    );
  }
  // Step 3: Hard delete
  await MyGlobal.prisma.healthcare_platform_org_department_assignments.delete({
    where: {
      id: props.orgDepartmentAssignmentId,
    },
  });
}
