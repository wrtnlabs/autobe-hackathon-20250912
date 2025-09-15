import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve single task details by taskId
 *
 * This operation fetches a task from the task_management_tasks table, including
 * details like status, priority, creator, project, board, and timestamps.
 * Access is restricted to authorized PM users.
 *
 * @param props - Object containing PM user info and taskId
 * @param props.pm - Authenticated PM user
 * @param props.taskId - UUID of the task to retrieve
 * @returns Detailed task entity conforming to ITaskManagementTask
 * @throws {Error} Throws if task not found or user unauthorized
 */
export async function gettaskManagementPmTasksTaskId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTask> {
  const { pm, taskId } = props;

  // Fetch the task ensuring soft delete not present
  const task = await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId, deleted_at: null },
  });

  // Map dates using toISOStringSafe
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
    deletedBy: undefined,
  };
}
