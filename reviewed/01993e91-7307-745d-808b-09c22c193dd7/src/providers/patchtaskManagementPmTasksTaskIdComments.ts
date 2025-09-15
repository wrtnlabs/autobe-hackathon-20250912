import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves a paginated list of comments for a specific task.
 *
 * This endpoint supports advanced filtering options based on commenter ID,
 * partial comment content, creation and update date ranges, along with standard
 * pagination controls.
 *
 * Authorization for PM role is required to access this data.
 *
 * @param props - Object containing the PM payload, task UUID, and filtering
 *   criteria
 * @param props.pm - The authenticated PM user payload
 * @param props.taskId - UUID of the task for which comments are retrieved
 * @param props.body - Filtering and pagination options for querying comments
 * @returns A paginated list of summary information for task comments matching
 *   the criteria
 * @throws {Error} If taskId is invalid or database access fails
 */
export async function patchtaskManagementPmTasksTaskIdComments(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IRequest;
}): Promise<IPageITaskManagementTaskComment.ISummary> {
  const { pm, taskId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: {
    task_id: string & tags.Format<"uuid">;
    deleted_at: null;
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
    task_id: taskId,
    deleted_at: null,
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

  const skip = (page - 1) * limit;

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

  const data = comments.map((comment) => ({
    id: comment.id,
    comment_body: comment.comment_body,
    created_at: toISOStringSafe(comment.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
