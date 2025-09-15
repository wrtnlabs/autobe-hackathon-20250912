import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve details of a specific task status change.
 *
 * This function fetches a single record from the
 * task_management_task_status_changes table using the provided taskId and
 * statusChangeId to uniquely identify the status change event.
 *
 * Authorization is enforced via TPM role, passed in props.tpm as identity
 * context.
 *
 * @param props - Object containing TPM auth info and identifiers
 * @param props.tpm - Authenticated TPM user payload
 * @param props.taskId - Unique identifier of the task
 * @param props.statusChangeId - Unique identifier of the task status change
 * @returns Detailed information of the task status change, including timestamps
 *   and optional comments
 * @throws {Error} Throws if the task status change record is not found
 */
export async function gettaskManagementTpmTasksTaskIdStatusChangesStatusChangeId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatusChange> {
  const { tpm, taskId, statusChangeId } = props;

  const statusChange =
    await MyGlobal.prisma.task_management_task_status_changes.findFirst({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });

  if (!statusChange) {
    throw new Error("Task status change record not found");
  }

  return {
    id: statusChange.id,
    task_id: statusChange.task_id,
    new_status_id: statusChange.new_status_id,
    changed_at: toISOStringSafe(statusChange.changed_at),
    comment: statusChange.comment ?? null,
  };
}
