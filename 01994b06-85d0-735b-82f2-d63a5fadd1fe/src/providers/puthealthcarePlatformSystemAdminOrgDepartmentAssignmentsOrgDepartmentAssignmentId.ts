import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an organization-department assignment by ID in
 * healthcare_platform_org_department_assignments.
 *
 * This operation updates the organization and/or department reference for a
 * specific assignment, enforcing all business rules around data presence and
 * referential integrity. The record is permitted to change only if not
 * soft-deleted, and the new references (organization/department) must
 * themselves exist and be active.
 *
 * Systemadmin authentication is required. All update attempts are audited by
 * updated_at timestamp and rejected if invalid.
 *
 * @param props - Required object containing:
 *
 *   - SystemAdmin: Authenticated SystemadminPayload
 *   - OrgDepartmentAssignmentId: UUID of the record to update
 *   - Body: Update fields (may include either org or department assignment changes)
 *
 * @returns The updated organization-department assignment object
 * @throws {Error} If the assignment does not exist, is deleted, or target
 *   org/department is missing or deleted
 */
export async function puthealthcarePlatformSystemAdminOrgDepartmentAssignmentsOrgDepartmentAssignmentId(props: {
  systemAdmin: SystemadminPayload;
  orgDepartmentAssignmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOrgDepartmentAssignment.IUpdate;
}): Promise<IHealthcarePlatformOrgDepartmentAssignment> {
  const { systemAdmin, orgDepartmentAssignmentId, body } = props;

  // Find the assignment (must exist and not be deleted)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: { id: orgDepartmentAssignmentId, deleted_at: null },
      },
    );
  if (!assignment) {
    throw new Error("Organization-department assignment not found or deleted");
  }

  // Validate new organization reference (if updating)
  if (body.healthcare_platform_organization_id !== undefined) {
    const organization =
      await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
        where: {
          id: body.healthcare_platform_organization_id,
          deleted_at: null,
        },
      });
    if (!organization) {
      throw new Error("Target organization not found or deleted");
    }
  }

  // Validate new department reference (if updating)
  if (body.healthcare_platform_department_id !== undefined) {
    const department =
      await MyGlobal.prisma.healthcare_platform_departments.findFirst({
        where: { id: body.healthcare_platform_department_id, deleted_at: null },
      });
    if (!department) {
      throw new Error("Target department not found or deleted");
    }
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.update(
      {
        where: { id: orgDepartmentAssignmentId },
        data: {
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id ?? undefined,
          healthcare_platform_department_id:
            body.healthcare_platform_department_id ?? undefined,
          updated_at: now,
        },
      },
    );

  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      updated.healthcare_platform_department_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
