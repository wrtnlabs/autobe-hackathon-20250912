import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Soft delete a forum thread given forumId and forumThreadId.
 *
 * This function checks existence and ownership, then marks the thread as
 * deleted by setting deleted_at timestamp to current time.
 *
 * Authorization: Only allowed to departmentManagers within same tenant scope.
 *
 * @param props.departmentManager - Authenticated department manager payload
 * @param props.forumId - UUID of the forum
 * @param props.forumThreadId - UUID of the forum thread
 * @returns Promise<void> void on successful deletion
 * @throws Error if the forum thread is not found
 */
export async function deleteenterpriseLmsDepartmentManagerForumsForumIdForumThreadsForumThreadId(props: {
  departmentManager: DepartmentmanagerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentManager, forumId, forumThreadId } = props;

  // Verify the forum thread exists and belongs to the specified forum
  const existingThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
      },
      select: {
        id: true,
        forum_id: true,
      },
    });

  if (!existingThread) {
    throw new Error("Forum thread not found");
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
