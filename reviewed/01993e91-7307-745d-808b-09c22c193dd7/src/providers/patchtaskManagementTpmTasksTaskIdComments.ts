import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * List and search comments on a task
 *
 * Retrieves a paginated list of comments belonging to the specified task.
 * Supports filtering by commenter, comment content, and date ranges.
 *
 * Only non-deleted comments (deleted_at IS NULL) are included.
 *
 * @param props - Object containing TPM user payload, taskId, and filter body
 * @returns Paginated comments matching filters with comment summaries
 * @throws {Error} Throws when internal errors occur in DB access
 */
export async function patchtaskManagementTpmTasksTaskIdComments(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IRequest;
}): Promise<IPageITaskManagementTaskComment.ISummary> {
  const { tpm, taskId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const whereCondition = {
    task_id: taskId,
    ...(body.commenter_id !== undefined &&
      body.commenter_id !== null && { commenter_id: body.commenter_id }),
    ...(body.comment_body !== undefined &&
      body.comment_body !== null && {
        comment_body: { contains: body.comment_body },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && { gte: body.updated_at_from }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && { lte: body.updated_at_to }),
          },
        }
      : {}),
    deleted_at: null,
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_comments.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, comment_body: true, created_at: true },
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
      pages: Math.ceil(total / limit),
    },
    data: comments.map((cmt) => ({
      id: cmt.id,
      comment_body: cmt.comment_body,
      created_at: toISOStringSafe(cmt.created_at),
    })),
  };
}
