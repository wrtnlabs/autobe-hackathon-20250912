import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Get detailed information of a forum thread by ID.
 *
 * This function retrieves a forum thread within the specified forum using its
 * unique ID. It returns thread details such as title, body, author, timestamps,
 * and deletion status.
 *
 * Access is authorized for externalLearner role, and tenancy isolation is
 * assumed.
 *
 * @param props - Request properties containing authentication and identifiers
 * @param props.externalLearner - Authenticated external learner making the
 *   request
 * @param props.forumId - UUID of the forum containing the thread
 * @param props.forumThreadId - UUID of the specific forum thread
 * @returns The detailed forum thread with all its relevant fields
 * @throws {Error} Throws if the forum thread is not found
 */
export async function getenterpriseLmsExternalLearnerForumsForumIdForumThreadsForumThreadId(props: {
  externalLearner: ExternallearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumThread> {
  const { forumId, forumThreadId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findUniqueOrThrow({
      where: {
        id: forumThreadId,
        forum_id: forumId,
      },
      select: {
        id: true,
        forum_id: true,
        author_id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: record.id,
    forum_id: record.forum_id,
    author_id: record.author_id,
    title: record.title,
    body: record.body ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
