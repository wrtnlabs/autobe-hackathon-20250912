import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves detailed task information by its unique identifier.
 *
 * This endpoint fetches a single task from the task_management_tasks table,
 * ensuring that only authorized developer users can access task details. It
 * returns the full task entity including all fields such as status, priority,
 * creator references, project and board membership, timestamps, and soft delete
 * info.
 *
 * @param props - Object containing the authenticated developer and the task ID
 * @param props.developer - The authenticated developer user payload
 * @param props.taskId - UUID string identifying the task to retrieve
 * @returns A promise resolving to the complete task information conforming to
 *   ITaskManagementTask
 * @throws {Error} Throws if the task with the provided ID does not exist or
 *   access is unauthorized
 */
export async function gettaskManagementDeveloperTasksTaskId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTask> {
  const { developer, taskId } = props;

  // Fetch the task from the database or throw if not found
  const task = await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Map the database record to the API DTO, converting dates appropriately
  return {
    id: task.id,
    status_id: task.status_id,
    priority_id: task.priority_id,
    creator_id: task.creator_id,
    project_id: task.project_id ?? null,
    board_id: task.board_id ?? null,
    title: task.title,
    description: task.description ?? null,
    status_name: task.status_name ?? null,
    priority_name: task.priority_name ?? null,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : null,
  };
}
