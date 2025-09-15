import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Create a new comment on a task by a QA user.
 *
 * This function creates a new comment in the task_management_task_comments
 * table, linking the comment to the specified task and commenter. Timestamps
 * for creation and update are automatically set.
 *
 * @param props - Object containing qa user payload, taskId path param, and
 *   comment body
 * @param props.qa - Authenticated QA user making the request
 * @param props.taskId - UUID of the task to attach the comment
 * @param props.body - The comment creation data including commenter_id and
 *   comment_body
 * @returns The created task comment with timestamps and identifiers
 * @throws {Error} If any database operation fails or required fields are
 *   missing
 */
export async function posttaskManagementQaTasksTaskIdComments(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.ICreate;
}): Promise<ITaskManagementTaskComment> {
  const { qa, taskId, body } = props;

  const isoNow = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_task_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      task_id: taskId,
      commenter_id: body.commenter_id,
      comment_body: body.comment_body,
      created_at: isoNow,
      updated_at: isoNow,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    task_id: created.task_id,
    commenter_id: created.commenter_id,
    comment_body: created.comment_body,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
