import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Paginated list retrieval of task status changes by task ID
 *
 * Retrieves a filtered and paginated list of status change history entries for
 * the given task. This method allows authorized TPM users to track the full
 * lifecycle of task status changes by returning detailed audit trail data
 * including new status, change timestamps, and optional admin comments.
 *
 * @param props - Object containing the authenticated TPM user, task ID to
 *   filter, and request body with pagination and optional filtering
 *   parameters.
 * @param props.tpm - Authenticated TPM user payload
 * @param props.taskId - UUID of the target task
 * @param props.body - Filter and pagination parameters
 * @returns A paginated list of task status change records.
 * @throws {Error} When the task ID is invalid or DB operation fails
 */
export async function patchtaskManagementTpmTasksTaskIdStatusChanges(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IRequest;
}): Promise<IPageITaskManagementTaskStatusChange> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;

  const data =
    await MyGlobal.prisma.task_management_task_status_changes.findMany({
      where: {
        task_id: props.taskId,
      },
      orderBy: {
        changed_at: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

  const total = await MyGlobal.prisma.task_management_task_status_changes.count(
    {
      where: {
        task_id: props.taskId,
      },
    },
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      task_id: item.task_id,
      new_status_id: item.new_status_id,
      changed_at: toISOStringSafe(item.changed_at),
      comment: item.comment ?? null,
    })),
  };
}
