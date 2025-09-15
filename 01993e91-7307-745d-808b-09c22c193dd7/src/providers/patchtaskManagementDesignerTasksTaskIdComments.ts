import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * List and search comments on a task
 *
 * Retrieves a paginated list of comments belonging to a specific task. Supports
 * filtering, sorting, and pagination according to request criteria. Ensures
 * only authorized designers can access task comments.
 *
 * @param props - Object containing authentication, path parameter, and request
 *   body
 * @param props.designer - Authenticated designer user requesting the comments
 * @param props.taskId - UUID of the target task to list comments for
 * @param props.body - Request body with filtering and pagination parameters
 * @returns Paginated summary of task comments matching the filters
 * @throws {Error} Throws if the database query fails or parameters are invalid
 */
export async function patchtaskManagementDesignerTasksTaskIdComments(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IRequest;
}): Promise<IPageITaskManagementTaskComment.ISummary> {
  const { designer, taskId, body } = props;

  const where = {
    task_id: taskId,
    deleted_at: null,
    ...(body.commenter_id !== undefined &&
      body.commenter_id !== null && {
        commenter_id: body.commenter_id,
      }),
    ...(body.comment_body !== undefined &&
      body.comment_body !== null && {
        comment_body: { contains: body.comment_body },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && {
                gte: body.updated_at_from,
              }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && {
                lte: body.updated_at_to,
              }),
          },
        }
      : {}),
  };

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const [total, comments] = await Promise.all([
    MyGlobal.prisma.task_management_task_comments.count({ where }),
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
  ]);

  const data = comments.map((comment) => ({
    id: comment.id,
    comment_body: comment.comment_body,
    created_at: toISOStringSafe(comment.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
