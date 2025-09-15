import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Updates an existing task in the task_management_tasks table.
 *
 * This operation allows an authorized PM user to modify details of a task
 * identified by the taskId path parameter. It validates references to status,
 * priority, project, and board entities and enforces access control to ensure
 * only the creator PM can update.
 *
 * @param props - Object containing pm payload, taskId, and update body
 * @param props.pm - Authenticated PM user payload
 * @param props.taskId - UUID of the task to update
 * @param props.body - Partial update payload conforming to
 *   ITaskManagementTask.IUpdate
 * @returns The updated task data conforming to ITaskManagementTask interface
 * @throws {Error} When the task doesn't exist or user is unauthorized
 * @throws {Error} When any referenced foreign key is invalid
 */
export async function puttaskManagementPmTasksTaskId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTask.IUpdate;
}): Promise<ITaskManagementTask> {
  const { pm, taskId, body } = props;

  // Fetch existing task
  const existingTask =
    await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
      where: { id: taskId },
    });

  // Authorization: Only the creator PM can update
  if (existingTask.creator_id !== pm.id) {
    throw new Error("Unauthorized: Only creator PM can update this task");
  }

  // Validate status_id if provided and not null
  if (body.status_id !== undefined && body.status_id !== null) {
    const statusCheck =
      await MyGlobal.prisma.task_management_task_statuses.findUnique({
        where: { id: body.status_id },
      });
    if (!statusCheck) throw new Error("Invalid status_id");
  }

  // Validate priority_id if provided and not null
  if (body.priority_id !== undefined && body.priority_id !== null) {
    const priorityCheck =
      await MyGlobal.prisma.task_management_priorities.findUnique({
        where: { id: body.priority_id },
      });
    if (!priorityCheck) throw new Error("Invalid priority_id");
  }

  // Validate project_id if provided and not null
  if (body.project_id !== undefined && body.project_id !== null) {
    const projectCheck =
      await MyGlobal.prisma.task_management_projects.findUnique({
        where: { id: body.project_id },
      });
    if (!projectCheck) throw new Error("Invalid project_id");
  }

  // Validate board_id if provided and not null
  if (body.board_id !== undefined && body.board_id !== null) {
    const boardCheck = await MyGlobal.prisma.task_management_boards.findUnique({
      where: { id: body.board_id },
    });
    if (!boardCheck) throw new Error("Invalid board_id");
  }

  // Prepare update data
  const updateData = {
    title: body.title ?? undefined,
    description:
      body.description === null ? null : (body.description ?? undefined),
    status_id: body.status_id === null ? null : (body.status_id ?? undefined),
    priority_id:
      body.priority_id === null ? null : (body.priority_id ?? undefined),
    project_id:
      body.project_id === null ? null : (body.project_id ?? undefined),
    board_id: body.board_id === null ? null : (body.board_id ?? undefined),
    due_date: body.due_date === null ? null : (body.due_date ?? undefined),
    updated_at: toISOStringSafe(new Date()),
  };

  // Update the task
  const updatedTask = await MyGlobal.prisma.task_management_tasks.update({
    where: { id: taskId },
    data: updateData,
  });

  // Return updated task with date conversions
  return {
    id: updatedTask.id,
    status_id: updatedTask.status_id,
    priority_id: updatedTask.priority_id,
    creator_id: updatedTask.creator_id,
    project_id: updatedTask.project_id ?? null,
    board_id: updatedTask.board_id ?? null,
    title: updatedTask.title,
    description: updatedTask.description ?? null,
    status_name: updatedTask.status_name ?? null,
    priority_name: updatedTask.priority_name ?? null,
    due_date: updatedTask.due_date
      ? toISOStringSafe(updatedTask.due_date)
      : null,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
    deleted_at: updatedTask.deleted_at
      ? toISOStringSafe(updatedTask.deleted_at)
      : null,
  };
}
