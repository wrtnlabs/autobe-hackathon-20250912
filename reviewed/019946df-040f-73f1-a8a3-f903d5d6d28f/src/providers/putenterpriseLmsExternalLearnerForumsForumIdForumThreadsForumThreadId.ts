import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Update a forum thread identified by 'forumThreadId' within a forum identified
 * by 'forumId'.
 *
 * This operation requires authorization as an external learner.
 *
 * The function verifies that the forum thread and forum exist and belong to the
 * same tenant as the external learner making the request, ensuring multi-tenant
 * security.
 *
 * Only the provided updatable fields in the body will be changed. The
 * `updated_at` timestamp will be set to current UTC time.
 *
 * @param props - Object containing externalLearner, forumId, forumThreadId, and
 *   the update body
 * @returns Updated forum thread structure respecting API contract types
 * @throws Error When forum thread or forum not found, forum ID mismatch, or
 *   unauthorized access
 */
export async function putenterpriseLmsExternalLearnerForumsForumIdForumThreadsForumThreadId(props: {
  externalLearner: ExternallearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { externalLearner, forumId, forumThreadId, body } = props;

  // Step 1: Fetch externalLearner from DB to get tenant_id
  const extLearner =
    await MyGlobal.prisma.enterprise_lms_externallearner.findUnique({
      where: { id: externalLearner.id },
    });
  if (!extLearner) throw new Error("External learner not found");

  // Step 2: Fetch forum thread
  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findUnique({
    where: { id: forumThreadId },
  });
  if (!thread) throw new Error("Forum thread not found");

  // Step 3: Fetch forum
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
  });
  if (!forum) throw new Error("Forum not found");

  // Step 4: Validate forumThread belongs to forum
  if (thread.forum_id !== forumId) throw new Error("Forum ID mismatch");

  // Step 5: Validate tenant id matches
  if (forum.tenant_id !== extLearner.tenant_id)
    throw new Error("Unauthorized access");

  // Step 6: Update thread with provided fields plus updated_at
  const updatedThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.update({
      where: { id: forumThreadId },
      data: {
        ...(body.forum_id !== undefined && { forum_id: body.forum_id }),
        ...(body.author_id !== undefined && { author_id: body.author_id }),
        ...(body.title !== undefined && { title: body.title }),
        // body is nullable
        ...(body.body !== undefined && { body: body.body }),
        ...(body.created_at !== undefined && { created_at: body.created_at }),
        updated_at: toISOStringSafe(new Date()),
        ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
      },
    });

  // Step 7: Return updated thread with proper date conversions
  return {
    id: updatedThread.id,
    forum_id: updatedThread.forum_id,
    author_id: updatedThread.author_id,
    title: updatedThread.title,
    body: updatedThread.body ?? undefined,
    created_at: toISOStringSafe(updatedThread.created_at),
    updated_at: toISOStringSafe(updatedThread.updated_at),
    deleted_at: updatedThread.deleted_at
      ? toISOStringSafe(updatedThread.deleted_at)
      : null,
  };
}
