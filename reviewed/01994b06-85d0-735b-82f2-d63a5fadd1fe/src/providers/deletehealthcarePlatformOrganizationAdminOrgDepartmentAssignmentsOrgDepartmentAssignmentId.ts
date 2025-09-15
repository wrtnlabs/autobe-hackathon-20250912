import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete an organization-to-department assignment.
 *
 * This operation removes an assignment record from
 * healthcare_platform_org_department_assignments by unique ID. It performs a
 * hard delete (not soft delete) and will throw if record does not exist or was
 * already deleted. Only accessible to organization admins; intended for use in
 * organizational restructure or administrative workflows.
 *
 * @param props - Required parameters for deletion operation
 * @param props.organizationAdmin - The authenticated organization admin user
 * @param props.orgDepartmentAssignmentId - The assignment's unique identifier
 *   (UUID)
 * @returns Void
 * @throws {Error} If the assignment does not exist or is already deleted
 */
export async function deletehealthcarePlatformOrganizationAdminOrgDepartmentAssignmentsOrgDepartmentAssignmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  orgDepartmentAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { orgDepartmentAssignmentId } = props;

  // Step 1: Validate that assignment exists and is active (not deleted)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: {
          id: orgDepartmentAssignmentId,
          deleted_at: null,
        },
      },
    );
  if (!assignment) {
    throw new Error(
      "Organization-department assignment not found or already deleted",
    );
  }

  // Step 2: Proceed with hard delete
  await MyGlobal.prisma.healthcare_platform_org_department_assignments.delete({
    where: { id: orgDepartmentAssignmentId },
  });
}
