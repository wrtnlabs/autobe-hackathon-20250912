import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Delete TPM user by ID.
 *
 * This operation performs a hard delete on the TPM user record identified by
 * the UUID path parameter from the task_management_pm table.
 *
 * Soft deletion is supported by the schema, but this operation removes the
 * record permanently.
 *
 * Access restrictions apply to authorized PM roles only.
 *
 * Once deleted, the user data cannot be recovered.
 *
 * @param props - Object containing PM user payload and TPM user ID to delete
 * @param props.pm - Authenticated PM user payload
 * @param props.id - UUID of the TPM user to delete
 * @throws {Error} If TPM user with given ID does not exist
 */
export async function deletetaskManagementPmTaskManagementTpmsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, id } = props;

  // Ensure the TPM user exists, throws if not
  await MyGlobal.prisma.task_management_pm.findUniqueOrThrow({
    where: { id },
  });

  // Perform permanent deletion of the TPM user record
  await MyGlobal.prisma.task_management_pm.delete({
    where: { id },
  });
}
