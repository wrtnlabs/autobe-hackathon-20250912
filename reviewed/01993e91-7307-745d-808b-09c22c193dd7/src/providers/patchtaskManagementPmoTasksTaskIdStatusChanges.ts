import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves a paginated and filtered list of task status change records for a
 * specified task.
 *
 * This function allows authorized PMO users to track task status change
 * histories, including status updates, timestamps, and optional comments.
 *
 * @param props - Object containing the PMO user credentials, target task ID,
 *   and filter parameters.
 * @param props.pmo - The authenticated PMO user making the request.
 * @param props.taskId - UUID of the task for which status changes are fetched.
 * @param props.body - Request body containing pagination and optional filtering
 *   parameters.
 * @returns A paginated list of task status change records matching the
 *   criteria.
 * @throws {Error} When the task ID is invalid or not found.
 */
export async function patchtaskManagementPmoTasksTaskIdStatusChanges(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IRequest;
}): Promise<IPageITaskManagementTaskStatusChange> {
  const { pmo, taskId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_status_changes.findMany({
      where: {
        task_id: taskId,
      },
      orderBy: {
        changed_at: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_task_status_changes.count({
      where: {
        task_id: taskId,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      task_id: record.task_id as string & tags.Format<"uuid">,
      new_status_id: record.new_status_id as string & tags.Format<"uuid">,
      changed_at: toISOStringSafe(record.changed_at),
      comment: record.comment ?? null,
    })),
  };
}
