import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

export async function deleteenterpriseLmsDepartmentManagerForumsForumIdForumThreadsForumThreadIdForumPostsForumPostId(props: {
  departmentManager: DepartmentmanagerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  forumPostId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentManager, forumId, forumThreadId, forumPostId } = props;

  // Fetch the departmentManager's tenant_id from database
  const manager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: { id: departmentManager.id },
      select: { tenant_id: true, status: true, deleted_at: true },
    });

  if (!manager || manager.status !== "active" || manager.deleted_at !== null) {
    throw new Error("Unauthorized: invalid department manager");
  }

  // Fetch forum to verify exist and tenant match
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
    select: { id: true, tenant_id: true },
  });

  if (!forum) {
    throw new Error("Forum not found");
  }

  if (forum.tenant_id !== manager.tenant_id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  // Verify forumThread belongs to forum
  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
      },
      select: { id: true },
    });

  if (!forumThread) {
    throw new Error("Forum thread not found or does not belong to forum");
  }

  // Verify forumPost belongs to forumThread
  const forumPost = await MyGlobal.prisma.enterprise_lms_forum_posts.findFirst({
    where: {
      id: forumPostId,
      thread_id: forumThreadId,
    },
    select: { id: true },
  });

  if (!forumPost) {
    throw new Error("Forum post not found or does not belong to thread");
  }

  // Hard delete forum post
  await MyGlobal.prisma.enterprise_lms_forum_posts.delete({
    where: { id: forumPostId },
  });
}
