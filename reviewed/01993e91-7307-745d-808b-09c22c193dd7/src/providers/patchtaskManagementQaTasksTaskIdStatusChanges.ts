import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Paginated list retrieval of task status changes by task ID
 *
 * Retrieves a filtered and paginated list of audit trail entries for the given
 * task's status changes.
 *
 * Allows QA users to track the full lifecycle of task status changes including
 * timestamps and optional comments.
 *
 * @param props - Object containing the QA user's authentication payload, the
 *   target task ID, and a request body with optional pagination parameters.
 * @param props.qa - The authenticated QA user making the request.
 * @param props.taskId - The UUID of the task whose status changes to retrieve.
 * @param props.body - Request body with optional page and limit for pagination.
 * @returns A paginated response object containing task status change records.
 * @throws {Error} Throws if any database operation fails.
 */
export async function patchtaskManagementQaTasksTaskIdStatusChanges(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IRequest;
}): Promise<IPageITaskManagementTaskStatusChange> {
  const { taskId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_status_changes.findMany({
      where: {
        task_id: taskId,
      },
      orderBy: { changed_at: "desc" },
      skip,
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
    data: results.map((r) => ({
      id: r.id,
      task_id: r.task_id,
      new_status_id: r.new_status_id,
      changed_at: toISOStringSafe(r.changed_at),
      comment: r.comment ?? null,
    })),
  };
}
