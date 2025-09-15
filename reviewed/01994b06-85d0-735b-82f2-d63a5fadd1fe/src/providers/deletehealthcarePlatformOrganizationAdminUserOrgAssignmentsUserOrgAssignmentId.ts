import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete a user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * Allows an authenticated organization admin to mark a user-organization
 * assignment as deleted by setting deleted_at. Only assignment records
 * belonging to the admin's managed organization can be soft-deleted. Deletions
 * are traceable for audit/compliance; non-existent or already-deleted
 * assignments result in error.
 *
 * @param props - Object containing authorization and path parameter
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   (must match org)
 * @param props.userOrgAssignmentId - Target assignment id to soft-delete
 * @returns Void
 * @throws {Error} If assignment cannot be found, is already deleted, or user is
 *   unauthorized
 */
export async function deletehealthcarePlatformOrganizationAdminUserOrgAssignmentsUserOrgAssignmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  userOrgAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, userOrgAssignmentId } = props;

  // Step 1: Lookup assignment; must exist, must not be deleted
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        id: userOrgAssignmentId,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error("Assignment not found or already deleted");
  }

  // Step 2: Lookup org-admin's own assignment to matching organization
  const orgAdminOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          assignment.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!orgAdminOrgAssignment) {
    throw new Error(
      "Forbidden: You are not authorized to delete assignments outside your organization.",
    );
  }

  // Step 3: Set deleted_at for soft-delete
  await MyGlobal.prisma.healthcare_platform_user_org_assignments.update({
    where: { id: userOrgAssignmentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // Step 4: Return void on success
}
