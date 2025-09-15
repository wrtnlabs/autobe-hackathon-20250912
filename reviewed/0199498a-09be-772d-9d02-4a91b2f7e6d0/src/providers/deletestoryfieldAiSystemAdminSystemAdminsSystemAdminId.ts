import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete (deactivate) a system administrator account
 * (storyfield_ai_systemadmins table).
 *
 * This operation marks the specified system administrator account as deleted by
 * setting the deleted_at timestamp in the storyfield_ai_systemadmins table.
 * This is a soft delete for compliance and audit, not a hard remove. Afterward,
 * the account becomes inaccessible for login or management while the record is
 * retained.
 *
 * Only authorized system administrators can invoke this endpoint. Attempts to
 * delete a non-existent or already-deleted account will result in an error. The
 * action is fully auditable.
 *
 * @param props - Input parameters
 * @param props.systemAdmin - The authenticated system administrator requesting
 *   the operation (authorization enforced at controller)
 * @param props.systemAdminId - The UUID of the target system administrator
 *   account to soft-delete
 * @returns Void
 * @throws Error if the target account does not exist or was already deleted
 */
export async function deletestoryfieldAiSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the system admin and check soft deletion status
  const admin = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      id: props.systemAdminId,
      deleted_at: null,
    },
  });
  if (admin === null) {
    throw new Error("System administrator not found or already deleted");
  }

  // Step 2: Soft-delete (set deleted_at to now)
  await MyGlobal.prisma.storyfield_ai_systemadmins.update({
    where: { id: props.systemAdminId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
