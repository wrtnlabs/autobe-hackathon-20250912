import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Delete a manager comment by ID
 *
 * This function permanently deletes a manager comment from the
 * job_performance_eval_manager_comments table identified by its unique ID. The
 * deletion is irreversible and only authorized managers can perform it.
 *
 * @param props - Object containing the authenticated manager and comment ID
 * @param props.manager - Authenticated manager payload performing deletion
 * @param props.id - UUID of the manager comment to delete
 * @returns Void
 * @throws {Error} Throws if the comment does not exist or if unauthorized
 */
export async function deletejobPerformanceEvalManagerManagerCommentsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, id } = props;

  const comment =
    await MyGlobal.prisma.job_performance_eval_manager_comments.findUniqueOrThrow(
      {
        where: { id },
        select: { manager_id: true },
      },
    );

  if (comment.manager_id !== manager.id) {
    throw new Error("Unauthorized: You can only delete your own comments");
  }

  await MyGlobal.prisma.job_performance_eval_manager_comments.delete({
    where: { id },
  });
}
