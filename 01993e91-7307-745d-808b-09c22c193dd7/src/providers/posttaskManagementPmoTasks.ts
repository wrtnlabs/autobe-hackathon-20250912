import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new task in the task_management_tasks table.
 *
 * This operation allows users with role PMO to submit task details including
 * title, description, creator ID, status, priority, due date, project, and
 * board associations. The task status defaults to 'To Do' when not specified.
 *
 * @param props - Object containing PMO user payload and task creation data.
 * @param props.pmo - Authenticated PMO user payload.
 * @param props.body - Task creation details conforming to
 *   ITaskManagementTask.ICreate.
 * @returns The newly created task entity with all fields populated.
 * @throws {Error} When the default status with code 'to_do' is missing in the
 *   database.
 */
export async function posttaskManagementPmoTasks(props: {
  pmo: PmoPayload;
  body: ITaskManagementTask.ICreate;
}): Promise<ITaskManagementTask> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  let statusId: (string & tags.Format<"uuid">) | undefined =
    props.body.status_id;

  if (!statusId) {
    const status =
      await MyGlobal.prisma.task_management_task_statuses.findFirst({
        where: { code: "to_do" },
      });
    if (!status) {
      throw new Error("Default status with code 'to_do' not found.");
    }
    statusId = status.id as string & tags.Format<"uuid">;
  }

  const created = await MyGlobal.prisma.task_management_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      status_id: statusId,
      priority_id: props.body.priority_id,
      creator_id: props.body.creator_id,
      project_id: props.body.project_id ?? null,
      board_id: props.body.board_id ?? null,
      title: props.body.title,
      description: props.body.description ?? null,
      status_name: props.body.status_name ?? null,
      priority_name: props.body.priority_name ?? null,
      due_date: props.body.due_date ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    status_id: created.status_id,
    priority_id: created.priority_id,
    creator_id: created.creator_id,
    project_id: created.project_id ?? null,
    board_id: created.board_id ?? null,
    title: created.title,
    description: created.description ?? null,
    status_name: created.status_name ?? null,
    priority_name: created.priority_name ?? null,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
