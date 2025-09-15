import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * This operation allows an authenticated organization admin to update select
 * fields (role_code, assignment_status) in an existing user-to-organization
 * assignment within their organization. Only the assignment's organization
 * admin can perform this update. The operation enforces ownership, soft delete
 * checks, and precise field mutation according to business rules. Updated date
 * fields are strictly transformed, and output matches the required DTO, with
 * all compliance for nullability and schema mapping.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   that must own the target organization
 * @param props.userOrgAssignmentId - UUID for the assignment to update
 * @param props.body - Update details (may partially update role_code and/or
 *   assignment_status)
 * @returns The updated user-organization assignment as an
 *   IHealthcarePlatformUserOrgAssignment
 * @throws {Error} When the assignment is not found, already deleted, or the
 *   admin is not authorized to update
 */
export async function puthealthcarePlatformOrganizationAdminUserOrgAssignmentsUserOrgAssignmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  userOrgAssignmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserOrgAssignment.IUpdate;
}): Promise<IHealthcarePlatformUserOrgAssignment> {
  // Fetch the assignment record, ensure exists and not soft deleted
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        id: props.userOrgAssignmentId,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error("Assignment not found or deleted");
  }

  // Confirm the requesting admin is admin for the assignment's org
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: props.organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!orgAdmin) {
    throw new Error("Organization admin not found or deleted");
  }
  if (assignment.healthcare_platform_organization_id !== orgAdmin.id) {
    throw new Error(
      "Access denied: admin can only update assignments in their own organization",
    );
  }

  // Prepare strict update (ignore any updates to immutable fields)
  const updateData: Pick<
    {
      role_code?: string;
      assignment_status?: string;
      updated_at: string & tags.Format<"date-time">;
    },
    "role_code" | "assignment_status" | "updated_at"
  > = {
    ...(props.body.role_code !== undefined
      ? { role_code: props.body.role_code }
      : {}),
    ...(props.body.assignment_status !== undefined
      ? { assignment_status: props.body.assignment_status }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Execute the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.update({
      where: { id: props.userOrgAssignmentId },
      data: updateData,
    });

  // Compose the return object with correct typing and nullability
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
        : null,
  };
}
