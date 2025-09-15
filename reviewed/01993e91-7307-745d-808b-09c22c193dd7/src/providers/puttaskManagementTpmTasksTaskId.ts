import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Updates an existing task in the task_management_tasks table.
 *
 * This operation allows a TPM user to update task details such as title,
 * description, status, priority, due date, project association, and board
 * association. It validates the existence of referenced entities and ensures
 * the TPM user owns the task.
 *
 * @param props - Object containing the TPM user, taskId, and update body.
 * @param props.tpm - The authenticated TPM user performing the update.
 * @param props.taskId - The UUID of the task to update.
 * @param props.body - Fields to update on the task, conforming to
 *   ITaskManagementTask.IUpdate.
 * @returns The updated task object conforming to ITaskManagementTask.
 * @throws {Error} When authorization fails, validation errors occur, or any
 *   referenced entity does not exist.
 */
export async function puttaskManagementTpmTasksTaskId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTask.IUpdate;
}): Promise<ITaskManagementTask> {
  const { tpm, taskId, body } = props;

  // Verify that task exists
  const task = await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Authorization check: TPM user must be the creator
  if (task.creator_id !== tpm.id) {
    throw new Error("Unauthorized: TPM user is not the creator of the task");
  }

  // Validate foreign key references if provided
  if (body.status_id !== undefined && body.status_id !== null) {
    await MyGlobal.prisma.task_management_task_statuses.findUniqueOrThrow({
      where: { id: body.status_id },
    });
  }

  if (body.priority_id !== undefined && body.priority_id !== null) {
    await MyGlobal.prisma.task_management_priorities.findUniqueOrThrow({
      where: { id: body.priority_id },
    });
  }

  if (body.project_id !== undefined && body.project_id !== null) {
    await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
      where: { id: body.project_id },
    });
  }

  if (body.board_id !== undefined && body.board_id !== null) {
    await MyGlobal.prisma.task_management_boards.findUniqueOrThrow({
      where: { id: body.board_id },
    });
  }

  // Validate that title, if provided, is not empty string
  if (body.title !== undefined && body.title.trim() === "") {
    throw new Error("Validation Error: title cannot be empty string");
  }

  const now = toISOStringSafe(new Date());

  // Update the task
  const updated = await MyGlobal.prisma.task_management_tasks.update({
    where: { id: taskId },
    data: {
      status_id: body.status_id === null ? undefined : body.status_id,
      priority_id: body.priority_id === null ? undefined : body.priority_id,
      project_id: body.project_id === null ? undefined : body.project_id,
      board_id: body.board_id === null ? undefined : body.board_id,
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      due_date: body.due_date ?? undefined,
      updated_at: now,
    },
  });

  // Prepare return object with date conversion
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
    deletedBy: null,
  };
}
