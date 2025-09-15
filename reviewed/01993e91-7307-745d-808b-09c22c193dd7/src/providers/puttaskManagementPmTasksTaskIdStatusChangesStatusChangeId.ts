import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update task status change record
 *
 * Updates fields of an existing task status change record specified by the
 * composite key consisting of taskId and statusChangeId.
 *
 * Authorization is guaranteed by the pm payload, which has already been
 * validated.
 *
 * Uses prisma client to perform a type-safe update operation.
 *
 * @param props - The function parameters including pm (authorized user),
 *   taskId, statusChangeId, and update body.
 * @returns The updated task status change record matching the interface
 *   ITaskManagementTaskStatusChange.
 * @throws Prisma.PrismaClientKnownRequestError if record not found or DB
 *   errors.
 */
export async function puttaskManagementPmTasksTaskIdStatusChangesStatusChangeId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IUpdate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { pm, taskId, statusChangeId, body } = props;

  const updateData: Partial<ITaskManagementTaskStatusChange.IUpdate> = {};

  if (body.new_status_id !== undefined && body.new_status_id !== null) {
    updateData.new_status_id = body.new_status_id;
  }

  if (body.changed_at !== undefined && body.changed_at !== null) {
    updateData.changed_at = body.changed_at;
  }

  if (body.comment !== undefined) {
    updateData.comment = body.comment;
  }

  const updated =
    await MyGlobal.prisma.task_management_task_status_changes.update({
      where: { id: statusChangeId, task_id: taskId },
      data: updateData,
    });

  return {
    id: updated.id,
    task_id: updated.task_id,
    new_status_id: updated.new_status_id,
    changed_at: toISOStringSafe(updated.changed_at),
    comment: updated.comment ?? null,
  };
}
