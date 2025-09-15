import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed information of a forum thread by ID.
 *
 * Retrieves the forum thread identified by forumThreadId within the specified
 * forumId. Returns thread details including title, body, author, timestamps,
 * and soft deletion status. Access is restricted to authenticated
 * organizationAdmin users.
 *
 * @param props - Contains authentication and path parameters.
 * @param props.organizationAdmin - Authenticated organizationAdmin user
 *   payload.
 * @param props.forumId - UUID of the target forum.
 * @param props.forumThreadId - UUID of the target forum thread.
 * @returns Detailed forum thread information conforming to
 *   IEnterpriseLmsForumThread.
 * @throws {Error} Throws if the thread does not exist or access is
 *   unauthorized.
 */
export async function getenterpriseLmsOrganizationAdminForumsForumIdForumThreadsForumThreadId(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumThread> {
  const { forumId, forumThreadId } = props;

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
