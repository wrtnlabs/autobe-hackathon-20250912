import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieves detailed information about a specific task identified by taskId for
 * the authenticated designer.
 *
 * This function fetches the task from the database, ensuring it exists, is not
 * soft deleted, and that the authenticated designer is authorized to access
 * it.
 *
 * @param props - Object containing the authenticated designer and the task ID
 *   to retrieve.
 * @param props.designer - The authenticated designer user payload containing
 *   the user ID.
 * @param props.taskId - The UUID of the task to fetch information for.
 * @returns A Promise resolving to the detailed task information conforming to
 *   ITaskManagementTask.
 * @throws {Error} If the task does not exist or has been deleted.
 * @throws {Error} If the designer is not authorized to access the task.
 */
export async function gettaskManagementDesignerTasksTaskId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTask> {
  const { designer, taskId } = props;

  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });

  if (!task || task.deleted_at !== null) {
    throw new Error("Task not found");
  }

  if (task.creator_id !== designer.id) {
    throw new Error("Unauthorized access to task");
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
