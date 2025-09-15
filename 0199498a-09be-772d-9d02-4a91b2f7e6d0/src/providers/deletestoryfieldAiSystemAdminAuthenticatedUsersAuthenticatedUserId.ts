import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete (deactivate) an authenticated user account
 * (storyfield_ai_authenticatedusers).
 *
 * Administratively deactivates (soft deletes) a specific authenticated user
 * account by marking the deleted_at timestamp. Only system administrators can
 * invoke this action. The soft-delete disables further user access but
 * preserves the record for audit/compliance.
 *
 * @param props - The operation properties
 * @param props.systemAdmin - Authenticated system admin performing the deletion
 * @param props.authenticatedUserId - Unique identifier of the user to
 *   deactivate (UUID)
 * @returns Void
 * @throws {Error} If the target user does not exist or is already soft-deleted
 */
export async function deletestoryfieldAiSystemAdminAuthenticatedUsersAuthenticatedUserId(props: {
  systemAdmin: SystemadminPayload;
  authenticatedUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { authenticatedUserId } = props;
  // Locate user for soft-delete (must exist and not already deleted)
  const user = await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst(
    {
      where: { id: authenticatedUserId, deleted_at: null },
    },
  );
  if (!user) {
    throw new Error("User not found or already deleted");
  }
  // Mark the user as soft-deleted by setting deleted_at
  await MyGlobal.prisma.storyfield_ai_authenticatedusers.update({
    where: { id: authenticatedUserId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
