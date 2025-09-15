import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new forum thread in a forum
 *
 * This operation creates a new forum thread under a specified forum using the
 * enterprise_lms_forum_threads table. Authorization is granted to the
 * systemAdmin role to create threads.
 *
 * @param props - Object containing systemAdmin payload, forumId path parameter,
 *   and thread creation body.
 * @param props.systemAdmin - Authenticated system administrator making the
 *   request.
 * @param props.forumId - UUID of the forum where the thread will be created.
 * @param props.body - Payload for creating the forum thread, including
 *   author_id, title, and optional body content.
 * @returns The created forum thread data conforming to
 *   IEnterpriseLmsForumThread.
 * @throws {Error} When the forum with given forumId does not exist or has been
 *   deleted.
 */
export async function postenterpriseLmsSystemAdminForumsForumIdForumThreads(props: {
  systemAdmin: SystemadminPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  const { systemAdmin, forumId, body } = props;

  // Verify the forum exists and is active
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: {
      id: forumId,
      deleted_at: null,
    },
  });
  if (!forum) throw new Error("Forum not found or has been deleted");

  // Generate new thread ID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the forum thread
  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id,
      forum_id: forumId,
      author_id: body.author_id,
      title: body.title,
      body: body.body ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created thread, converting dates and handling nullable fields
  return {
    id: created.id as string & tags.Format<"uuid">,
    forum_id: created.forum_id as string & tags.Format<"uuid">,
    author_id: created.author_id as string & tags.Format<"uuid">,
    title: created.title,
    body: created.body ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
