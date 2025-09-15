import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Delete a Technical Project Manager (TPM) user by ID.
 *
 * This operation performs a hard delete on the TPM user record identified by
 * the UUID path parameter from the task_management_tpm table. Soft deletion is
 * supported by the schema, but this operation removes the record permanently.
 * Access restrictions apply to authorized roles only due to data sensitivity.
 * Once deleted, the user data cannot be recovered.
 *
 * @param props - Object containing the PMO authentication payload and the TPM
 *   user's UUID to delete
 * @param props.pmo - The authenticated PMO user making the deletion request
 * @param props.id - The UUID of the TPM user to delete
 * @throws {Error} When the TPM user with the specified ID does not exist
 * @throws {Prisma.PrismaClientKnownRequestError} When deletion constraints are
 *   violated
 */
export async function deletetaskManagementPmoTaskManagementTpmsId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, id } = props;

  // Confirm existence of TPM user; will throw if not found
  await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id },
  });

  // Permanently delete the TPM user
  await MyGlobal.prisma.task_management_tpm.delete({ where: { id } });
}
