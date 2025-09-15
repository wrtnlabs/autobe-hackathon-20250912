import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Creates a new comment on a specific task by an authorized TPM user.
 *
 * This method verifies existence and non-deletion of the target task and
 * commenter user. It then creates a new task comment with the provided content
 * and returns the fully detailed comment.
 *
 * @param props - Object containing authenticated TPM user, taskId path
 *   parameter, and comment creation body
 * @param props.tpm - Authenticated TPM user information
 * @param props.taskId - UUID of the task to which the comment belongs
 * @param props.body - Comment creation data including commenter_id and
 *   comment_body
 * @returns The newly created task comment data
 * @throws {Error} When the target task or commenter does not exist or is
 *   deleted
 */
export async function posttaskManagementTpmTasksTaskIdComments(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.ICreate;
}): Promise<ITaskManagementTaskComment> {
  const { tpm, taskId, body } = props;

  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (!task) throw new Error("Task not found");
  if (task.deleted_at !== null) throw new Error("Task is deleted");

  const commenter = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: body.commenter_id },
  });
  if (!commenter) throw new Error("Commenter not found");
  if (commenter.deleted_at !== null) throw new Error("Commenter is deleted");

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_task_comments.create({
    data: {
      id: v4(),
      task_id: taskId,
      commenter_id: body.commenter_id,
      comment_body: body.comment_body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    task_id: created.task_id,
    commenter_id: created.commenter_id,
    comment_body: created.comment_body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
