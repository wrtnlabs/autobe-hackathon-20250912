import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a forum thread by ID within a forum.
 *
 * Updates the title, body, and other updatable fields of the specified forum
 * thread identified by 'forumThreadId' within the given forum identified by
 * 'forumId'. This operation checks that the thread belongs to a forum within
 * the systemAdmin's tenant, enforcing multi-tenant security boundaries.
 *
 * @param props - Properties of the request.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update.
 * @param props.forumId - The UUID of the forum containing the thread.
 * @param props.forumThreadId - The UUID of the forum thread to update.
 * @param props.body - The update payload for the forum thread.
 * @returns The updated forum thread data.
 * @throws {Error} Throws if the forum or thread does not exist or access is
 *   denied.
 */
export async function putenterpriseLmsSystemAdminForumsForumIdForumThreadsForumThreadId(props: {
  systemAdmin: SystemadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { systemAdmin, forumId, forumThreadId, body } = props;

  // Verify the forum exists and belongs to the systemAdmin's tenant
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: {
      id: forumId,
      tenant_id: systemAdmin.id,
    },
  });

  if (!forum) throw new Error("Forum not found or access denied.");

  // Verify the forum thread exists and belongs to the forum
  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
      },
    });

  if (!forumThread) throw new Error("Forum thread not found or access denied.");

  // Current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update forum thread data
  const updated = await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      forum_id: body.forum_id ?? undefined,
      author_id: body.author_id ?? undefined,
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: now,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    forum_id: updated.forum_id,
    author_id: updated.author_id,
    title: updated.title,
    body: updated.body ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
