import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Deletes a Technical Project Manager (TPM) user by their unique identifier.
 *
 * This operation performs a hard (permanent) deletion of the TPM user record in
 * the database. Only the TPM user themselves may delete their own account.
 *
 * @param props - An object containing the authenticated TPM payload and the
 *   unique identifier of the TPM user to be deleted.
 * @param props.tpm - The authenticated TPM user performing the deletion.
 * @param props.id - The UUID of the TPM user to delete.
 * @throws {Error} When the authenticated user attempts to delete another user's
 *   account.
 * @throws {Error} When the TPM user with the specified ID does not exist.
 */
export async function deletetaskManagementTpmTaskManagementTpmsId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization check: only allow deletion of own account
  if (props.tpm.id !== props.id) {
    throw new Error("Unauthorized: can only delete your own account");
  }

  // Check if TPM user exists
  const existing = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: props.id },
  });
  if (!existing) {
    throw new Error("TPM user not found");
  }

  // Hard delete the TPM user
  await MyGlobal.prisma.task_management_tpm.delete({
    where: { id: props.id },
  });
}
