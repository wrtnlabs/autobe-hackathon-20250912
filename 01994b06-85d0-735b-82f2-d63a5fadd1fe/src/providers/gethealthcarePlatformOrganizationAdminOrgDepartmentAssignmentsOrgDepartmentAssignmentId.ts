import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a specific organization-department assignment by ID from
 * healthcare_platform_org_department_assignments.
 *
 * This endpoint retrieves detailed information about a specific
 * organization-department assignment, including full assignment metadata and
 * audit timestamps, by unique ID. The requesting organization admin must belong
 * to the same organization as the assignment.
 *
 * @param props - Operation parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the request
 * @param props.orgDepartmentAssignmentId - The unique UUID of the
 *   organization-department assignment to retrieve
 * @returns The assignment record with full metadata and audit fields
 * @throws {Error} If the assignment is not found
 * @throws {Error} If the authenticated admin is not authorized for this
 *   assignment's organization
 */
export async function gethealthcarePlatformOrganizationAdminOrgDepartmentAssignmentsOrgDepartmentAssignmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  orgDepartmentAssignmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOrgDepartmentAssignment> {
  const { organizationAdmin, orgDepartmentAssignmentId } = props;

  // 1. Fetch the assignment by id
  const assignment =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: { id: orgDepartmentAssignmentId },
      },
    );
  if (!assignment) {
    throw new Error("Organization-department assignment not found");
  }

  // 2. Authorization: Only allow access if org admin is assigned to the same organization
  const adminOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          assignment.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!adminOrgAssignment) {
    throw new Error(
      "Access denied: Organization admin not authorized for this organization",
    );
  }

  // 3. Map and return result, converting all date fields using toISOStringSafe
  return {
    id: assignment.id,
    healthcare_platform_organization_id:
      assignment.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      assignment.healthcare_platform_department_id,
    created_at: toISOStringSafe(assignment.created_at),
    updated_at: toISOStringSafe(assignment.updated_at),
    deleted_at:
      assignment.deleted_at === null || assignment.deleted_at === undefined
        ? assignment.deleted_at
        : toISOStringSafe(assignment.deleted_at),
  };
}
