import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * List and search comments on a task
 *
 * Retrieve a paginated list of comments belonging to a specific task. This
 * endpoint supports filtering, sorting, and pagination to efficiently access
 * comment data.
 *
 * This operation requires authentication as a QA role user.
 *
 * @param props - Object containing QA user payload, taskId param, and request
 *   body
 * @param props.qa - Authenticated QA user payload
 * @param props.taskId - UUID of the target task for fetching comments
 * @param props.body - Filters and pagination parameters for the comments
 * @returns Paginated summary of task comments matching filters
 * @throws {Error} When the QA user is not found or is soft-deleted
 */
export async function patchtaskManagementQaTasksTaskIdComments(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IRequest;
}): Promise<IPageITaskManagementTaskComment.ISummary> {
  const { qa, taskId, body } = props;

  const page =
    body.page && body.page > 0
      ? body.page
      : (1 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const limit =
    body.limit && body.limit > 0
      ? body.limit
      : (10 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (page - 1) * limit;

  await MyGlobal.prisma.task_management_qa.findFirstOrThrow({
    where: { id: qa.id, deleted_at: null },
  });

  const where: {
    deleted_at: null;
    task_id: string & tags.Format<"uuid">;
    commenter_id?: string & tags.Format<"uuid">;
    comment_body?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
    task_id: taskId,
  };

  if (body.commenter_id !== undefined && body.commenter_id !== null) {
    where.commenter_id = body.commenter_id;
  }

  if (body.comment_body !== undefined && body.comment_body !== null) {
    where.comment_body = { contains: body.comment_body };
  }

  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    where.created_at = {};
    if (body.created_at_from !== undefined && body.created_at_from !== null) {
      where.created_at.gte = body.created_at_from;
    }
    if (body.created_at_to !== undefined && body.created_at_to !== null) {
      where.created_at.lte = body.created_at_to;
    }
  }

  if (
    (body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
  ) {
    where.updated_at = {};
    if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
      where.updated_at.gte = body.updated_at_from;
    }
    if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
      where.updated_at.lte = body.updated_at_to;
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_comments.findMany({
      where,
      select: { id: true, comment_body: true, created_at: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_task_comments.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  const data = rows.map((row) => ({
    id: row.id,
    comment_body: row.comment_body,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
