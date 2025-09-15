import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Create a new forum thread inside the forum identified by 'forumId'.
 *
 * This operation creates a new forum thread under the specified forum by
 * verifying forum existence and inserting a new record into
 * 'enterprise_lms_forum_threads'.
 *
 * Authorization: permitted for guest users with valid payload.
 *
 * @param props - Object containing guest payload, forumId, and thread creation
 *   data
 * @param props.guest - Authenticated guest user payload
 * @param props.forumId - UUID identifier of the target forum
 * @param props.body - Forum thread creation data complying with
 *   IEnterpriseLmsForumThread.ICreate
 * @returns The newly created forum thread with all fields populated
 * @throws {Error} When the specified forum does not exist or is deleted
 */
export async function postenterpriseLmsGuestForumsForumIdForumThreads(props: {
  guest: GuestPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  const { guest, forumId, body } = props;

  // Verify the forum exists and is active (not soft deleted)
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: { id: forumId, deleted_at: null },
    select: { id: true, tenant_id: true },
  });

  if (!forum) {
    throw new Error("Forum not found or deleted");
  }

  // Prepare ISO string timestamps for creation and update
  const now = toISOStringSafe(new Date());

  // Generate a new UUID for the forum thread id
  const newId = v4() as string & tags.Format<"uuid">;

  // Create the forum thread record
  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id: newId,
      forum_id: forumId,
      author_id: guest.id,
      title: body.title,
      body: body.body ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created thread with correctly formatted date-time fields
  return {
    id: created.id,
    forum_id: created.forum_id,
    author_id: created.author_id,
    title: created.title,
    body: created.body ?? null,
    created_at: created.created_at ? toISOStringSafe(created.created_at) : now,
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : now,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
