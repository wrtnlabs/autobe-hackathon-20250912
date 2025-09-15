import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete a department entity for a given organization
 * (healthcare_platform_departments table) by setting the deleted_at timestamp.
 *
 * This operation performs a soft delete on a department within a specific
 * organization in the healthcarePlatform system. If the admin user has a valid
 * assignment to the organization and the department exists (and is not already
 * deleted), the department's 'deleted_at' and 'updated_at' fields are set to
 * the current time in ISO 8601 format. This ensures compliance and auditability
 * rather than physical removal.
 *
 * Authorization is enforced by verifying that the authenticated organization
 * admin is actively assigned to the target organization. The department must
 * belong to the organization and be active (not already deleted). Attempts to
 * delete departments from other organizations, already deleted departments, or
 * as non-assigned admins will result in errors.
 *
 * @param props - Properties for deletion
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.organizationId - UUID of the organization
 * @param props.departmentId - UUID of the department to delete
 * @returns Void
 * @throws {Error} When the admin is not assigned to the organization, the
 *   department does not exist or is already deleted, or other business rule
 *   violations
 */
export async function deletehealthcarePlatformOrganizationAdminOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, organizationId, departmentId } = props;

  // Authorization: check assignment
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: organizationId,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error(
      "Permission denied: You are not assigned to this organization.",
    );
  }

  // Get department only if active (not deleted)
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: departmentId,
        healthcare_platform_organization_id: organizationId,
        deleted_at: null,
      },
    });
  if (!department) {
    throw new Error(
      "Department not found in this organization, or already deleted.",
    );
  }

  // Optionally: check for legal hold / resource lock here (skipped for scope)

  // Soft delete: set deleted_at and updated_at to now (ISO8601)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_departments.update({
    where: { id: departmentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
