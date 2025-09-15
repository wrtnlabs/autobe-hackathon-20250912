import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve single task details by taskId
 *
 * This operation fetches detailed task information for a given taskId from the
 * task_management_tasks table. It returns the full task entity including title,
 * description, status, priority, due date, creator, and related project or
 * board information.
 *
 * Authorization: Only PMO users with valid credentials may access this data.
 *
 * @param props - Object containing PMO payload and task UUID
 * @param props.pmo - Authenticated PMO user payload
 * @param props.taskId - UUID of the task to retrieve
 * @returns Full task details conforming to ITaskManagementTask
 * @throws {Error} Throws if the task does not exist
 */
export async function gettaskManagementPmoTasksTaskId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTask> {
  const { pmo, taskId } = props;

  const task = await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
    select: {
      id: true,
      status_id: true,
      priority_id: true,
      creator_id: true,
      project_id: true,
      board_id: true,
      title: true,
      description: true,
      status_name: true,
      priority_name: true,
      due_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: task.id,
    status_id: task.status_id,
    priority_id: task.priority_id,
    creator_id: task.creator_id,
    project_id: task.project_id === null ? undefined : task.project_id,
    board_id: task.board_id === null ? undefined : task.board_id,
    title: task.title,
    description: task.description === null ? undefined : task.description,
    status_name: task.status_name === null ? undefined : task.status_name,
    priority_name: task.priority_name === null ? undefined : task.priority_name,
    due_date:
      task.due_date === null ? undefined : toISOStringSafe(task.due_date),
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at:
      task.deleted_at === null ? undefined : toISOStringSafe(task.deleted_at),
  };
}
