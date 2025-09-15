import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * Allows an authorized system administrator to remove (soft delete) a
 * user-organization assignment by setting the 'deleted_at' column, preserving
 * traceability for compliance and audit.
 *
 * This operation checks that the given assignment exists and is not already
 * deleted (deleted_at is null), and soft-deletes it by updating deleted_at and
 * updated_at to the current timestamp. Attempts to delete missing or
 * already-deleted assignments throw an error.
 *
 * @param props - Properties including:
 *
 *   - SystemAdmin: The authenticated system administrator (SystemadminPayload)
 *   - UserOrgAssignmentId: The UUID of the assignment to delete
 *
 * @returns Void
 * @throws {Error} If the assignment is not found or already deleted
 */
export async function deletehealthcarePlatformSystemAdminUserOrgAssignmentsUserOrgAssignmentId(props: {
  systemAdmin: SystemadminPayload;
  userOrgAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Ensure the user-org assignment exists and is active (not deleted)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        id: props.userOrgAssignmentId,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error(
      "User-organization assignment not found or already deleted.",
    );
  }
  // Step 2: Soft-delete by setting deleted_at (and updated_at) to now (ISO 8601 string)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_user_org_assignments.update({
    where: { id: props.userOrgAssignmentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
