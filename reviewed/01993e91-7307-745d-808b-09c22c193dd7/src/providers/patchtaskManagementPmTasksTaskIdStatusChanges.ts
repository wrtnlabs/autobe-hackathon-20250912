import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Paginated list retrieval of task status changes by task ID.
 *
 * This operation retrieves a paginated list of status change records associated
 * with a specified task. It uses the task_management_task_status_changes table
 * from the Prisma schema and requires the task ID as a path parameter to filter
 * the status changes. This endpoint is designed to give users an audit trail of
 * task status progressions including timestamps and optional comments.
 * Pagination and filtering parameters are supported in the request body to
 * enable efficient querying and result management.
 *
 * Only authenticated Project Manager (PM) users can perform this operation.
 *
 * @param props - Object containing the authenticated PM payload, taskId path
 *   parameter, and request body for pagination and filtering.
 * @param props.pm - Authenticated PM user performing the operation.
 * @param props.taskId - UUID of the task to retrieve status changes for.
 * @param props.body - Request body with optional filters and pagination
 *   controls.
 * @returns Paginated list of task status change records.
 * @throws {Error} Throws if an internal error occurs.
 */
export async function patchtaskManagementPmTasksTaskIdStatusChanges(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IRequest;
}): Promise<IPageITaskManagementTaskStatusChange> {
  const { pm, taskId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const whereCondition = {
    task_id: taskId,
  };

  const total = await MyGlobal.prisma.task_management_task_status_changes.count(
    {
      where: whereCondition,
    },
  );

  const records =
    await MyGlobal.prisma.task_management_task_status_changes.findMany({
      where: whereCondition,
      orderBy: { changed_at: "desc" },
      skip: skip,
      take: limit,
    });

  const data = records.map((record) => ({
    id: record.id,
    task_id: record.task_id,
    new_status_id: record.new_status_id,
    changed_at: toISOStringSafe(record.changed_at),
    comment: record.comment ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data,
  };
}
