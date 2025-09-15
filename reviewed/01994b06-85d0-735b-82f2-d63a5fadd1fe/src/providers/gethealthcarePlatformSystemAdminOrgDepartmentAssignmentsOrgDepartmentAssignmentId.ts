import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a specific organization-department assignment by ID from
 * healthcare_platform_org_department_assignments.
 *
 * Retrieves full assignment details (IDs, timestamps, soft-delete status) for
 * management and audit. Requires systemAdmin authentication; throws error if
 * the assignment is not found.
 *
 * @param props - Method parameters.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.orgDepartmentAssignmentId - Unique ID of the assignment to
 *   retrieve.
 * @returns The organization-department assignment details.
 * @throws {Error} If no assignment is found with the specified ID.
 */
export async function gethealthcarePlatformSystemAdminOrgDepartmentAssignmentsOrgDepartmentAssignmentId(props: {
  systemAdmin: SystemadminPayload;
  orgDepartmentAssignmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOrgDepartmentAssignment> {
  const { orgDepartmentAssignmentId } = props;
  const assignment =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findUnique(
      {
        where: { id: orgDepartmentAssignmentId },
        select: {
          id: true,
          healthcare_platform_organization_id: true,
          healthcare_platform_department_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!assignment) throw new Error("Org-department assignment not found");
  return {
    id: assignment.id,
    healthcare_platform_organization_id:
      assignment.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      assignment.healthcare_platform_department_id,
    created_at: toISOStringSafe(assignment.created_at),
    updated_at: toISOStringSafe(assignment.updated_at),
    deleted_at: assignment.deleted_at
      ? toISOStringSafe(assignment.deleted_at)
      : null,
  };
}
