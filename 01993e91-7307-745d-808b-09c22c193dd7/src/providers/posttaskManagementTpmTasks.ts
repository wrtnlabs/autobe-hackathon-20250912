import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import { TpmPayload } from "../decorators/payload/TpmPayload";

export async function posttaskManagementTpmTasks(props: {
  tpm: TpmPayload;
  body: ITaskManagementTask.ICreate;
}): Promise<ITaskManagementTask> {
  const { tpm, body } = props;

  const now = toISOStringSafe(new Date());

  let statusId = body.status_id;
  if (statusId === null || statusId === undefined) {
    const defaultStatus =
      await MyGlobal.prisma.task_management_task_statuses.findFirst({
        where: { code: "to_do" },
      });
    if (!defaultStatus) throw new Error("Default status 'to_do' not found");
    statusId = defaultStatus.id as string & tags.Format<"uuid">;
  }

  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_tasks.create({
    data: {
      id: newId,
      status_id: statusId,
      priority_id: body.priority_id,
      creator_id: body.creator_id,
      project_id: body.project_id ?? undefined,
      board_id: body.board_id ?? undefined,
      title: body.title,
      description: body.description ?? null,
      status_name: body.status_name ?? null,
      priority_name: body.priority_name ?? null,
      due_date: body.due_date ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    status_id: created.status_id as string & tags.Format<"uuid">,
    priority_id: created.priority_id as string & tags.Format<"uuid">,
    creator_id: created.creator_id as string & tags.Format<"uuid">,
    project_id: created.project_id ?? null,
    board_id: created.board_id ?? null,
    title: created.title,
    description: created.description ?? null,
    status_name: created.status_name ?? null,
    priority_name: created.priority_name ?? null,
    due_date: created.due_date ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
