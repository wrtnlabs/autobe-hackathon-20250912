import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves a paginated list of task comments for a specified task.
 *
 * This operation supports filtering by commenter ID, comment content, creation
 * and update timestamps with pagination and sorting.
 *
 * Only authenticated developers may access this data.
 *
 * @param props - The request properties.
 * @param props.developer - The authenticated developer making the request.
 * @param props.taskId - The UUID of the target task to filter comments.
 * @param props.body - Request filters and pagination options.
 * @returns A paginated summary list of task comments matching the criteria.
 * @throws {Error} Throws if database operations fail or taskId is invalid.
 */
export async function patchtaskManagementDeveloperTasksTaskIdComments(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IRequest;
}): Promise<IPageITaskManagementTaskComment.ISummary> {
  const { developer, taskId, body } = props;

  const page = body.page === undefined || body.page === null ? 1 : body.page;
  const limit =
    body.limit === undefined || body.limit === null ? 10 : body.limit;

  const skip = (Number(page) - 1) * Number(limit);

  const whereCondition = {
    deleted_at: null,
    ...(body.task_id !== undefined && body.task_id !== null
      ? { task_id: body.task_id }
      : { task_id }),
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
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
            body.updated_at_from !== null
              ? { gte: body.updated_at_from }
              : {}),
            ...(body.updated_at_to !== undefined && body.updated_at_to !== null
              ? { lte: body.updated_at_to }
              : {}),
          },
        }
      : {}),
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_comments.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.task_management_task_comments.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      comment_body: comment.comment_body,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
