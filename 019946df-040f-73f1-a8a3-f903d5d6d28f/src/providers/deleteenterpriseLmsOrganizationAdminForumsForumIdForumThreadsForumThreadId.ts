import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete a forum thread by setting its deleted_at timestamp.
 *
 * This operation enforces that the organizationAdmin owns the forum. It
 * verifies the forum exists and belongs to the organizationAdmin. The forum
 * thread is verified to exist and not already deleted. Finally, the thread's
 * deleted_at is updated to mark it as soft deleted.
 *
 * @param props - Object containing organizationAdmin authorization and path
 *   parameters
 * @param props.organizationAdmin - Authenticated organizationAdmin user payload
 * @param props.forumId - UUID of the forum containing the thread
 * @param props.forumThreadId - UUID of the forum thread to be soft deleted
 * @throws {Error} When the forum does not exist or authorization fails
 * @throws {Error} When the forum thread does not exist or is already deleted
 */
export async function deleteenterpriseLmsOrganizationAdminForumsForumIdForumThreadsForumThreadId(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, forumId, forumThreadId } = props;

  // Fetch the forum and verify ownership by matching owner_id with organizationAdmin.id
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
  });

  if (!forum || forum.owner_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Unauthorized forum access");
  }

  // Fetch the forum thread ensuring it's not already deleted
  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
      },
    });

  if (!forumThread) {
    throw new Error("Not Found: Forum thread does not exist");
  }

  // Perform soft delete by setting deleted_at to current ISO string
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      deleted_at: deletedAt,
    },
  });
}
