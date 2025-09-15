import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Soft delete a forum thread by setting its deleted_at timestamp.
 *
 * This operation ensures that the forum thread belongs to the forum specified
 * and that the tenant of the forum matches the authenticated
 * contentCreatorInstructor's tenant. If the thread does not exist or the tenant
 * check fails, an error is thrown.
 *
 * @param props - The property object containing the authenticated user and
 *   identifiers.
 * @param props.contentCreatorInstructor - The authenticated content
 *   creator/instructor with id and tenant info.
 * @param props.forumId - UUID of the forum containing the thread.
 * @param props.forumThreadId - UUID of the forum thread to soft delete.
 * @throws {Error} Throws if forum thread not found or unauthorized access.
 */
export async function deleteenterpriseLmsContentCreatorInstructorForumsForumIdForumThreadsForumThreadId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, forumId, forumThreadId } = props;

  // Fetch contentCreatorInstructor tenant_id
  const user =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUniqueOrThrow(
      {
        where: { id: contentCreatorInstructor.id },
        select: { tenant_id: true },
      },
    );

  // Find the forum thread and include the forum for tenant check
  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
      },
      include: { forum: true },
    });

  if (!forumThread) {
    throw new Error("Forum thread not found");
  }

  if (forumThread.forum.tenant_id !== user.tenant_id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  // Perform soft delete by updating deleted_at
  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
