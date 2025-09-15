import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information of a forum thread by ID
 *
 * This endpoint retrieves detailed information about a specific forum thread
 * within a given forum. It fetches all relevant thread fields such as title,
 * body, author, timestamps, and soft deletion status from the database.
 *
 * Authorization: Requires systemAdmin role authentication. Access is limited to
 * valid user roles ensuring multi-tenant data isolation and permissions.
 *
 * @param props - Object containing systemAdmin authentication token, forumId
 *   and forumThreadId.
 * @param props.systemAdmin - Authenticated system administrator user payload.
 * @param props.forumId - UUID of the target forum.
 * @param props.forumThreadId - UUID of the target forum thread.
 * @returns Detailed forum thread information conforming to
 *   IEnterpriseLmsForumThread.
 * @throws {Error} Throws if forum thread is not found or access is
 *   unauthorized.
 */
export async function getenterpriseLmsSystemAdminForumsForumIdForumThreadsForumThreadId(props: {
  systemAdmin: SystemadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumThread> {
  const { systemAdmin, forumId, forumThreadId } = props;

  const thread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirstOrThrow({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
      },
    });

  return {
    id: thread.id,
    forum_id: thread.forum_id,
    author_id: thread.author_id,
    title: thread.title,
    body: thread.body ?? null,
    created_at: toISOStringSafe(thread.created_at),
    updated_at: toISOStringSafe(thread.updated_at),
    deleted_at: thread.deleted_at ? toISOStringSafe(thread.deleted_at) : null,
  };
}
