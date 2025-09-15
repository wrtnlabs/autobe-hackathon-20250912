import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve details of a specific task status change
 *
 * This function retrieves a single task status change record identified by
 * taskId and statusChangeId. It returns the full details including timestamps
 * and optional comment.
 *
 * @param props - Object containing developer authentication and identifiers
 * @param props.developer - Authenticated developer payload enforcing
 *   authorization
 * @param props.taskId - UUID of the target task
 * @param props.statusChangeId - UUID of the task status change to retrieve
 * @returns Detailed task status change information
 * @throws {Error} When no task status change exists for the given IDs
 */
export async function gettaskManagementDeveloperTasksTaskIdStatusChangesStatusChangeId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatusChange> {
  const { developer, taskId, statusChangeId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_status_changes.findFirst({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });

  if (!record) {
    throw new Error(
      `Task status change not found for taskId ${taskId} and statusChangeId ${statusChangeId}`,
    );
  }

  return {
    id: record.id,
    task_id: record.task_id,
    new_status_id: record.new_status_id,
    changed_at: toISOStringSafe(record.changed_at),
    comment: record.comment ?? null,
  };
}
