import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve single task details by taskId.
 *
 * This endpoint retrieves detailed information about a specific task from the
 * task_management_tasks table, including fields like status, priority, creator,
 * project, board, and timestamps. Only authorized QA users can invoke this
 * endpoint.
 *
 * @param props - Object containing qa payload and taskId parameter
 * @param props.qa - Authenticated QA user payload
 * @param props.taskId - UUID of the task to retrieve
 * @returns Detailed ITaskManagementTask object
 * @throws {Error} If the task does not exist or is soft deleted
 */
export async function gettaskManagementQaTasksTaskId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTask> {
  const { qa, taskId } = props;

  // Fetch the task from the database with soft delete check
  const task = await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: {
      id: taskId,
      deleted_at: null,
    },
  });

  // Return with date fields converted to ISO string & tags.Format<'date-time'>
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
