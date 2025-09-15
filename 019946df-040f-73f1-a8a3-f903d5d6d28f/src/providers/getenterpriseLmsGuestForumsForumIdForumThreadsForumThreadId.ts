import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Get detailed information of a forum thread by its ID within a specified
 * forum.
 *
 * This operation retrieves the forum thread record from the database, including
 * the title, body, author, timestamps, and soft deletion status.
 *
 * Access is restricted to authenticated guests with appropriate permissions.
 *
 * @param props - Object containing the guest user info and required path
 *   parameters.
 * @param props.guest - Authenticated guest user making the request.
 * @param props.forumId - UUID of the forum to retrieve the thread from.
 * @param props.forumThreadId - UUID of the forum thread to retrieve.
 * @returns The forum thread details conforming to IEnterpriseLmsForumThread.
 * @throws {Error} When the forum thread is not found.
 */
export async function getenterpriseLmsGuestForumsForumIdForumThreadsForumThreadId(props: {
  guest: GuestPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumThread> {
  const { guest, forumId, forumThreadId } = props;

  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
    where: {
      forum_id: forumId,
      id: forumThreadId,
    },
  });

  if (thread === null) throw new Error("Forum thread not found");

  return {
    id: thread.id,
    forum_id: thread.forum_id,
    author_id: thread.author_id,
    title: thread.title,
    body: thread.body === null ? undefined : thread.body,
    created_at: toISOStringSafe(thread.created_at),
    updated_at: toISOStringSafe(thread.updated_at),
    deleted_at:
      thread.deleted_at === null
        ? undefined
        : toISOStringSafe(thread.deleted_at),
  };
}
