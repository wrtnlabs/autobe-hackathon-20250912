import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Deletes a task permanently from the task_management_tasks table by its unique
 * identifier.
 *
 * This operation performs a hard delete, completely removing the task record.
 * It requires the caller to be authorized as a TPM.
 *
 * @param props - Object containing the TPM payload and the task ID to delete
 * @param props.tpm - TPM user payload performing the delete action
 * @param props.taskId - UUID of the task to be deleted
 * @returns Void
 * @throws {Error} Throws if the task does not exist
 */
export async function deletetaskManagementTpmTasksTaskId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { taskId } = props;

  // Verify the task exists or throw
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Perform hard delete
  await MyGlobal.prisma.task_management_tasks.delete({
    where: { id: taskId },
  });
}
