import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Soft delete a forum thread by setting its 'deleted_at' timestamp.
 *
 * This operation requires that the guest user is authorized within the tenant
 * owning the forum to which the thread belongs.
 *
 * @param props - Operation parameters including guest payload, forum ID, and
 *   forum thread ID.
 * @throws {Error} When the forum thread is not found or guest has no access.
 * @throws {Error} When the forum is not found.
 * @throws {Error} When guest tenant does not match forum tenant.
 */
export async function deleteenterpriseLmsGuestForumsForumIdForumThreadsForumThreadId(props: {
  guest: GuestPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { guest, forumId, forumThreadId } = props;

  // Verify the forum thread exists and is not deleted
  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
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

  if (!thread) {
    throw new Error("Forum thread not found or access denied");
  }

  // Retrieve the forum tenant
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
    select: { tenant_id: true },
  });

  if (!forum) {
    throw new Error("Forum not found");
  }

  // Verify guest's tenant matches the forum's tenant
  const guestInfo = await MyGlobal.prisma.enterprise_lms_guest.findUnique({
    where: { id: guest.id },
    select: { tenant_id: true },
  });

  if (!guestInfo || guestInfo.tenant_id !== forum.tenant_id) {
    throw new Error("Access denied: guest tenant mismatch");
  }

  // Soft delete the thread by updating deleted_at
  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
