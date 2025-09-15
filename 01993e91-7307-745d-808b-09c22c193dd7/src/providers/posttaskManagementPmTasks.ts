import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new task in the task_management_tasks table.
 *
 * This endpoint allows users with roles TPM, PM, and PMO to create tasks for
 * collaborative management. The task can include mandatory and optional fields
 * such as title, description, status, priority, due date, project and board
 * affiliation.
 *
 * @param props - Object containing the PM payload and the task creation body
 * @param props.pm - The authenticated PM user payload
 * @param props.body - The task creation details compliant with
 *   ITaskManagementTask.ICreate
 * @returns The newly created task record from the database
 * @throws {Error} Throws errors from Prisma client for database failures
 */
export async function posttaskManagementPmTasks(props: {
  pm: PmPayload;
  body: ITaskManagementTask.ICreate;
}): Promise<ITaskManagementTask> {
  const { pm, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.task_management_tasks.create({
    data: {
      id,
      status_id: body.status_id,
      priority_id: body.priority_id,
      creator_id: body.creator_id,
      project_id: body.project_id ?? undefined,
      board_id: body.board_id ?? undefined,
      title: body.title,
      description: body.description ?? undefined,
      status_name: body.status_name ?? undefined,
      priority_name: body.priority_name ?? undefined,
      due_date: body.due_date ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    status_id: created.status_id,
    priority_id: created.priority_id,
    creator_id: created.creator_id,
    project_id:
      created.project_id === null ? null : (created.project_id ?? undefined),
    board_id:
      created.board_id === null ? null : (created.board_id ?? undefined),
    title: created.title,
    description: created.description ?? null,
    status_name: created.status_name ?? null,
    priority_name: created.priority_name ?? null,
    due_date:
      created.due_date === null ? null : (created.due_date ?? undefined),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : (created.deleted_at ?? undefined),
  };
}
