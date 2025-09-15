import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve single task details for a TPM user by taskId.
 *
 * This function fetches the task entity from the database, validates
 * authorization, converts date fields to ISO strings, and returns a fully typed
 * ITaskManagementTask. Only TPM users who are the creator of the task are
 * authorized to access it.
 *
 * @param props - Object containing TPM user payload and task ID
 * @param props.tpm - Authenticated TPM user
 * @param props.taskId - UUID of the task to retrieve
 * @returns The detailed task information conforming to ITaskManagementTask
 * @throws {Error} If the task does not exist or the TPM user is not authorized
 */
export async function gettaskManagementTpmTasksTaskId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTask> {
  const { tpm, taskId } = props;

  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });

  if (task === null) {
    throw new Error("Task not found");
  }

  if (task.creator_id !== tpm.id) {
    throw new Error("Unauthorized: You can only access tasks you created");
  }

  return {
    id: task.id,
    status_id: task.status_id,
    priority_id: task.priority_id,
    creator_id: task.creator_id,
    project_id: task.project_id ?? undefined,
    board_id: task.board_id ?? undefined,
    title: task.title,
    description: task.description ?? undefined,
    status_name: task.status_name ?? undefined,
    priority_name: task.priority_name ?? undefined,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : undefined,
  };
}
