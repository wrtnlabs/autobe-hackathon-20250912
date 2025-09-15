import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch details of a specific user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * This endpoint allows a system administrator to retrieve all information about
 * a particular user-to-organization assignment. It returns assignment metadata,
 * including the assignment's user ID, organization ID, role code, assignment
 * status, and audit timestamps.
 *
 * Authorization: Requires authenticated SystemadminPayload (systemAdmin role).
 * Throws an error if the assignment is not found.
 *
 * @param props - Object containing request details
 * @param props.systemAdmin - Authenticated system admin payload (authorization
 *   is handled via decorator)
 * @param props.userOrgAssignmentId - Unique identifier (UUID) of the user-org
 *   assignment to retrieve
 * @returns The detailed user-org assignment object
 * @throws {Error} If no assignment found for the provided ID
 */
export async function gethealthcarePlatformSystemAdminUserOrgAssignmentsUserOrgAssignmentId(props: {
  systemAdmin: SystemadminPayload;
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
  return {
    id: assignment.id,
    user_id: assignment.user_id,
    healthcare_platform_organization_id:
      assignment.healthcare_platform_organization_id,
    role_code: assignment.role_code,
    assignment_status: assignment.assignment_status,
    created_at: toISOStringSafe(assignment.created_at),
    updated_at: toISOStringSafe(assignment.updated_at),
    ...(assignment.deleted_at !== null && assignment.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(assignment.deleted_at) }
      : {}),
  };
}
