import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete task priority by ID
 *
 * Permanently deletes a task priority record identified by its UUID. Only
 * authorized TPM users can perform this operation. Throws an error if the
 * priority does not exist.
 *
 * @param props - The props object containing authentication and the priority ID
 * @param props.tpm - Authenticated TPM user performing the deletion
 * @param props.id - UUID of the task priority to delete
 * @throws {Error} If the task priority with the specified ID does not exist
 */
export async function deletetaskManagementTpmTaskManagementPrioritiesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, id } = props;

  // Verify existence of the priority
  const priority = await MyGlobal.prisma.task_management_priorities.findUnique({
    where: { id },
  });

  if (!priority) {
    throw new Error(`Priority with id ${id} does not exist.`);
  }

  // Perform hard delete
  await MyGlobal.prisma.task_management_priorities.delete({
    where: { id },
  });
}
