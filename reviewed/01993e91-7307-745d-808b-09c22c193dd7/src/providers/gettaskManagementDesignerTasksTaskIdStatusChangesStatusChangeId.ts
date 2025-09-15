import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieve details of a specific task status change.
 *
 * This endpoint fetches detailed information for a given status change
 * associated with a task, identified by `taskId` and `statusChangeId`. It
 * includes metadata such as timestamps and optional comments for auditing
 * purposes.
 *
 * Authorized users with the 'designer' role can access this operation.
 *
 * @param props - Object containing authorization and route parameters
 * @param props.designer - Authenticated designer user payload
 * @param props.taskId - UUID of the task to which the status change belongs
 * @param props.statusChangeId - UUID of the specific status change
 * @returns Detailed task status change record
 * @throws {Error} Throws if the task status change record does not exist
 */
export async function gettaskManagementDesignerTasksTaskIdStatusChangesStatusChangeId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatusChange> {
  const { designer, taskId, statusChangeId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_status_changes.findFirstOrThrow({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });

  return {
    id: record.id,
    task_id: record.task_id,
    new_status_id: record.new_status_id,
    changed_at: toISOStringSafe(record.changed_at),
    comment: record.comment ?? null,
  };
}
