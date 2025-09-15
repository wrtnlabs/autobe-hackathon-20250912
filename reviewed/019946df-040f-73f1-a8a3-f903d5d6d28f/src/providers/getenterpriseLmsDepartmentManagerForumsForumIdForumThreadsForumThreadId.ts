import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Retrieves a detailed forum thread information by its ID within a specified
 * forum.
 *
 * This operation fetches the forum thread's title, body, author information,
 * timestamps, and soft deletion status from the 'enterprise_lms_forum_threads'
 * table. Access is restricted to authenticated department managers.
 *
 * @param props - Object containing authenticated departmentManager and path
 *   parameters forumId, forumThreadId
 * @param props.departmentManager - Authenticated department manager's payload
 * @param props.forumId - UUID string of the target forum
 * @param props.forumThreadId - UUID string of the target forum thread
 * @returns The detailed forum thread information matching the specified IDs
 * @throws {Error} Throws if the forum thread is not found or unauthorized
 */
export async function getenterpriseLmsDepartmentManagerForumsForumIdForumThreadsForumThreadId(props: {
  departmentManager: DepartmentmanagerPayload;
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
    body: thread.body ?? undefined,
    created_at: toISOStringSafe(thread.created_at),
    updated_at: toISOStringSafe(thread.updated_at),
    deleted_at: thread.deleted_at ? toISOStringSafe(thread.deleted_at) : null,
  };
}
