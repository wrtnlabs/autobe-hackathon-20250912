import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * List and search comments on a task
 *
 * Retrieves a paginated list of task comments filtered by search criteria. The
 * user must be an authorized PMO to access this data.
 *
 * @param props - Object containing authentication, task id, and request body
 * @param props.pmo - Authenticated PMO user payload
 * @param props.taskId - UUID of the task to filter comments
 * @param props.body - Filtering and pagination criteria
 * @returns Paginated summary of task comments
 * @throws {Error} When the task is not found or unauthorized access
 */
export async function patchtaskManagementPmoTasksTaskIdComments(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IRequest;
}): Promise<IPageITaskManagementTaskComment.ISummary> {
  const { pmo, taskId, body } = props;

  // Verify task existence and soft delete
  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
    select: { id: true },
  });
  if (!task) throw new Error(`Task not found: ${taskId}`);

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build where clause for filtering
  const where: any = {
    deleted_at: null,
    task_id: taskId,
  };

  if (body.commenter_id !== undefined && body.commenter_id !== null) {
    where.commenter_id = body.commenter_id;
  }

  if (body.comment_body !== undefined && body.comment_body !== null) {
    where.comment_body = {
      contains: body.comment_body,
    };
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

  // Calculate offset
  const skip = (page - 1) * limit;

  // Query for results and total count
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        comment_body: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.task_management_task_comments.count({ where }),
  ]);

  // Format and return
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      comment_body: comment.comment_body,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
