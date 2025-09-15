import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Update a forum thread specified by 'forumThreadId' within the forum
 * 'forumId'.
 *
 * This function enforces that only guests belonging to the forum's tenant may
 * update the thread. It validates the existence of both forum and forum
 * thread.
 *
 * The update supports partial changes, with updated_at automatically set to
 * current time. All Date fields are handled as ISO string branded types.
 *
 * @param props - The update request parameters and authenticated guest payload.
 * @param props.guest - The authenticated guest user payload.
 * @param props.forumId - UUID of the forum containing the thread.
 * @param props.forumThreadId - UUID of the thread to update.
 * @param props.body - The partial update data for the forum thread.
 * @returns The updated forum thread data with all fields properly typed.
 * @throws {Error} When forum or thread does not exist, or authorization fails.
 */
export async function putenterpriseLmsGuestForumsForumIdForumThreadsForumThreadId(props: {
  guest: GuestPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { guest, forumId, forumThreadId, body } = props;

  // Fetch the forum thread
  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findUnique({
      where: { id: forumThreadId },
    });
  if (!forumThread) {
    throw new Error("Forum thread not found");
  }

  // Validate forumThread belongs to forumId
  if (forumThread.forum_id !== forumId) {
    throw new Error("Forum thread does not belong to the specified forum");
  }

  // Fetch the forum
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
  });
  if (!forum) {
    throw new Error("Forum not found");
  }

  // Authorization: check guest tenant matches forum tenant
  // Note: guest.id is user id, tenant_id is not provided in payload
  // Ideally, fetch guest Tenant from DB
  const guestRecord = await MyGlobal.prisma.enterprise_lms_guest.findUnique({
    where: { id: guest.id },
  });
  if (!guestRecord) {
    throw new Error("Guest record not found");
  }

  if (guestRecord.tenant_id !== forum.tenant_id) {
    throw new Error("Unauthorized: guest and forum tenant mismatch");
  }

  // Prepare update data
  const updateData: IEnterpriseLmsForumThread.IUpdate = {};

  if (body.forum_id !== undefined) updateData.forum_id = body.forum_id;
  if (body.author_id !== undefined) updateData.author_id = body.author_id;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.body !== undefined) updateData.body = body.body;
  if (body.created_at !== undefined) updateData.created_at = body.created_at;

  updateData.updated_at = toISOStringSafe(new Date());

  if ("deleted_at" in body) {
    updateData.deleted_at = body.deleted_at ?? null;
  }

  // Update in DB
  const updated = await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: updateData,
  });

  // Return updated thread with correct date formatting
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
