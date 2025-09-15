import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an organization-department assignment by ID in
 * healthcare_platform_org_department_assignments.
 *
 * This function updates the details of an existing organization-department
 * assignment record (row) identified by orgDepartmentAssignmentId. You may
 * update the linked organization or department, subject to uniqueness
 * constraints and foreign key validity. Only permitted for authenticated
 * organizationAdmin users. All mutations are compliance-audited with timestamps
 * and strict error handling for business rules.
 *
 * @param props - OrganizationAdmin: The authenticated organizationAdmin user
 *   (authorization enforced) orgDepartmentAssignmentId: UUID of the assignment
 *   to update body: Patch object with new organization or department IDs, as
 *   allowed
 * @returns The updated assignment row, normalized for DTO contract
 * @throws {Error} - Assignment not found (if no matching assignment or already
 *   deleted) Target organization not found (if provided reference does not
 *   exist) Target department not found (if provided reference does not exist)
 *   Assignment with this org and department already exists (if unique
 *   constraint violated)
 */
export async function puthealthcarePlatformOrganizationAdminOrgDepartmentAssignmentsOrgDepartmentAssignmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  orgDepartmentAssignmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOrgDepartmentAssignment.IUpdate;
}): Promise<IHealthcarePlatformOrgDepartmentAssignment> {
  const { orgDepartmentAssignmentId, body } = props;

  // Find target assignment, must not be soft deleted
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
    throw new Error("Assignment not found");
  }

  // If modifying org, check if referenced org exists
  if (
    typeof body.healthcare_platform_organization_id === "string" &&
    body.healthcare_platform_organization_id !==
      assignment.healthcare_platform_organization_id
  ) {
    const org =
      await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
        where: { id: body.healthcare_platform_organization_id },
      });
    if (!org) {
      throw new Error("Target organization not found");
    }
  }
  // If modifying dept, check if referenced dept exists
  if (
    typeof body.healthcare_platform_department_id === "string" &&
    body.healthcare_platform_department_id !==
      assignment.healthcare_platform_department_id
  ) {
    const dept =
      await MyGlobal.prisma.healthcare_platform_departments.findFirst({
        where: { id: body.healthcare_platform_department_id },
      });
    if (!dept) {
      throw new Error("Target department not found");
    }
  }
  // Enforce uniqueness: cannot update to an active org+dept pair that's not this row
  const proposedOrgId =
    typeof body.healthcare_platform_organization_id === "string"
      ? body.healthcare_platform_organization_id
      : assignment.healthcare_platform_organization_id;
  const proposedDeptId =
    typeof body.healthcare_platform_department_id === "string"
      ? body.healthcare_platform_department_id
      : assignment.healthcare_platform_department_id;
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: {
          healthcare_platform_organization_id: proposedOrgId,
          healthcare_platform_department_id: proposedDeptId,
          id: { not: orgDepartmentAssignmentId },
          deleted_at: null,
        },
      },
    );
  if (duplicate) {
    throw new Error("Assignment with this org and department already exists");
  }

  // Always set updated_at to now, patch only provided fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.update(
      {
        where: { id: orgDepartmentAssignmentId },
        data: {
          ...(typeof body.healthcare_platform_organization_id === "string" && {
            healthcare_platform_organization_id:
              body.healthcare_platform_organization_id,
          }),
          ...(typeof body.healthcare_platform_department_id === "string" && {
            healthcare_platform_department_id:
              body.healthcare_platform_department_id,
          }),
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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
