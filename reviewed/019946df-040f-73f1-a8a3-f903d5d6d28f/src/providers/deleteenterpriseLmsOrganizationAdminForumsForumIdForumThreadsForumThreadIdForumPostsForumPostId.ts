import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

export async function deleteenterpriseLmsOrganizationAdminForumsForumIdForumThreadsForumThreadIdForumPostsForumPostId(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  forumPostId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, forumId, forumThreadId, forumPostId } = props;

  const forumPost = await MyGlobal.prisma.enterprise_lms_forum_posts.findUnique(
    {
      where: { id: forumPostId },
    },
  );

  if (!forumPost) {
    throw new Error("Forum post not found");
  }

  if (forumPost.thread_id !== forumThreadId) {
    throw new Error("Forum post does not belong to the specified forum thread");
  }

  // Check forum ownership via forum_thread
  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findUnique({
      where: { id: forumThreadId },
    });

  if (!forumThread) {
    throw new Error("Forum thread not found");
  }

  if (forumThread.forum_id !== forumId) {
    throw new Error("Forum thread does not belong to the specified forum");
  }

  await MyGlobal.prisma.enterprise_lms_forum_posts.delete({
    where: { id: forumPostId },
  });
}
