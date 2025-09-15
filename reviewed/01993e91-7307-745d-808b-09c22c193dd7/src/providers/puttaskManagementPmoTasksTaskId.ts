import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Updates an existing task in the task_management_tasks table identified by
 * taskId.
 *
 * This operation validates all provided foreign key references (status_id,
 * priority_id, project_id, board_id) to ensure they exist before applying the
 * update.
 *
 * The task's updated_at field is set to the current timestamp in ISO string
 * format.
 *
 * @param props - Object containing the PMO payload, taskId, and task update
 *   body
 * @param props.pmo - Authenticated PMO user payload
 * @param props.taskId - UUID of the task to update
 * @param props.body - Partial update data for the task
 * @returns The fully updated task object conforming to ITaskManagementTask
 * @throws {Error} Throws error if any referenced entity does not exist or task
 *   is not found
 */
export async function puttaskManagementPmoTasksTaskId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTask.IUpdate;
}): Promise<ITaskManagementTask> {
  const { pmo, taskId, body } = props;

  // Check that the task exists
  const task = await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Validate referenced status_id
  if (body.status_id !== undefined && body.status_id !== null) {
    const status =
      await MyGlobal.prisma.task_management_task_statuses.findUnique({
        where: { id: body.status_id },
      });
    if (!status) throw new Error("Invalid status_id: not found");
  }

  // Validate referenced priority_id
  if (body.priority_id !== undefined && body.priority_id !== null) {
    const priority =
      await MyGlobal.prisma.task_management_priorities.findUnique({
        where: { id: body.priority_id },
      });
    if (!priority) throw new Error("Invalid priority_id: not found");
  }

  // Validate referenced project_id
  if (body.project_id !== undefined && body.project_id !== null) {
    const project = await MyGlobal.prisma.task_management_projects.findUnique({
      where: { id: body.project_id },
    });
    if (!project) throw new Error("Invalid project_id: not found");
  }

  // Validate referenced board_id
  if (body.board_id !== undefined && body.board_id !== null) {
    const board = await MyGlobal.prisma.task_management_boards.findUnique({
      where: { id: body.board_id },
    });
    if (!board) throw new Error("Invalid board_id: not found");
  }

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Prepare update object
  const updateData = {
    status_id: body.status_id === null ? undefined : body.status_id,
    priority_id: body.priority_id === null ? undefined : body.priority_id,
    project_id: body.project_id === null ? undefined : body.project_id,
    board_id: body.board_id === null ? undefined : body.board_id,
    title: body.title ?? undefined,
    description:
      body.description === null ? null : (body.description ?? undefined),
    due_date: body.due_date === null ? undefined : (body.due_date ?? undefined),
    updated_at: now,
  };

  // Execute the update
  const updated = await MyGlobal.prisma.task_management_tasks.update({
    where: { id: taskId },
    data: updateData,
  });

  // Return updated task with proper ISO string date conversions
  return {
    id: updated.id,
    status_id: updated.status_id,
    priority_id: updated.priority_id,
    creator_id: updated.creator_id,
    project_id: updated.project_id ?? null,
    board_id: updated.board_id ?? null,
    title: updated.title,
    description: updated.description ?? null,
    status_name: updated.status_name ?? null,
    priority_name: updated.priority_name ?? null,
    due_date: updated.due_date ? toISOStringSafe(updated.due_date) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
