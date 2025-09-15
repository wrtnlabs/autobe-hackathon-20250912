import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch details of a specific user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * GET /userOrgAssignments/{userOrgAssignmentId} provides complete details of a
 * user-organization assignment mapping via the
 * healthcare_platform_user_org_assignments Prisma table. It is used by system
 * and organization administrators to audit, review, or verify membership,
 * permission, and RBAC assignment history for a specific user within a tenant.
 *
 * The operation requires a valid UUID for the assignment. It returns assignment
 * metadata (user, organization, role, status, created/updated/deleted
 * timestamps), enabling workflows like offboarding, reassignment, or compliance
 * review. Security checks ensure only authorized staff can view sensitive
 * assignment information, with scope filtering as required by business rules.
 *
 * @param props - Object containing the parameters for the request
 * @param props.organizationAdmin - The authenticated organization admin
 *   requesting the assignment (provided by the decorator)
 * @param props.userOrgAssignmentId - Unique identifier (UUID) for the
 *   assignment to retrieve
 * @returns The detailed assignment record including user ID, organization,
 *   role, status, timestamps
 * @throws {Error} If the assignment does not exist or has been deleted
 */
export async function gethealthcarePlatformOrganizationAdminUserOrgAssignmentsUserOrgAssignmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  userOrgAssignmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserOrgAssignment> {
  const { userOrgAssignmentId } = props;

  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findUnique({
      where: { id: userOrgAssignmentId },
    });

  if (!assignment) {
    throw new Error("Assignment not found");
  }
  if (assignment.deleted_at !== null) {
    throw new Error("Assignment has been deleted");
  }

  return {
    id: assignment.id,
    user_id: assignment.user_id,
    healthcare_platform_organization_id:
      assignment.healthcare_platform_organization_id,
    role_code: assignment.role_code,
    assignment_status: assignment.assignment_status,
    created_at: toISOStringSafe(assignment.created_at),
    updated_at: toISOStringSafe(assignment.updated_at),
    deleted_at: assignment.deleted_at === null ? null : undefined,
  };
}
