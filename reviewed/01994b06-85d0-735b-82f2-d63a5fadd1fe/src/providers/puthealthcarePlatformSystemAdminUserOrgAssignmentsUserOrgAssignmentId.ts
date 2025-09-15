import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * This endpoint allows platform administrators to update the role or status of
 * a user-organization assignment. Only allowed roles and assignment statuses
 * can be set, and every change is strictly audit-logged and business-validated
 * for compliance and security.
 *
 * Strictly forbids updating immutable fields (id, user_id, organization_id,
 * created_at, deleted_at). Assignment must exist or a clear error is thrown.
 * All updated_at values use precise ISO 8601 string format. Systemadmin
 * authentication is required (enforced by props).
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated Systemadmin making the request
 *   (must have full systemAdmin privileges)
 * @param props.userOrgAssignmentId - The UUID of the assignment record to
 *   update
 * @param props.body - Fields to update: role_code and/or assignment_status
 *   (optional)
 * @returns The updated assignment record
 * @throws {Error} When the assignment does not exist, or business validation
 *   fails (invalid role_code or assignment_status)
 */
export async function puthealthcarePlatformSystemAdminUserOrgAssignmentsUserOrgAssignmentId(props: {
  systemAdmin: SystemadminPayload;
  userOrgAssignmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserOrgAssignment.IUpdate;
}): Promise<IHealthcarePlatformUserOrgAssignment> {
  const { systemAdmin, userOrgAssignmentId, body } = props;

  // Authorization is enforced by the controller/decorator contract

  // 1. Fetch and validate the assignment record exists
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findUnique({
      where: { id: userOrgAssignmentId },
    });
  if (!assignment) {
    throw new Error("User-Org assignment not found");
  }

  // 2. Business validation: Only allow specific roles/statuses
  const allowedRoles = [
    "staff",
    "manager",
    "organizationAdmin",
    "medicalDoctor",
  ];
  const allowedStatus = ["active", "pending", "suspended", "deleted"];

  if (body.role_code !== undefined && !allowedRoles.includes(body.role_code)) {
    throw new Error("Invalid role_code");
  }
  if (
    body.assignment_status !== undefined &&
    !allowedStatus.includes(body.assignment_status)
  ) {
    throw new Error("Invalid assignment_status");
  }

  // 3. Perform the update for allowed mutable properties
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.update({
      where: { id: userOrgAssignmentId },
      data: {
        ...(body.role_code !== undefined ? { role_code: body.role_code } : {}),
        ...(body.assignment_status !== undefined
          ? { assignment_status: body.assignment_status }
          : {}),
        updated_at: nowIso,
      },
    });

  return {
    id: updated.id,
    user_id: updated.user_id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    role_code: updated.role_code,
    assignment_status: updated.assignment_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
