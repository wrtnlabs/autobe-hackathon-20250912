import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Updates an existing forum post content and metadata ensuring only the author
 * can perform the update.
 *
 * Verifies that the forum post exists, matches the provided forumThreadId and
 * that the caller (corporateLearner) is the author. Updates the post with the
 * new data provided, and returns the updated post with proper formatted date
 * strings.
 *
 * @param props - The input parameters containing authentication payload and
 *   update information
 * @param props.corporateLearner - Authenticated corporate learner payload
 *   performing the update
 * @param props.forumId - The UUID identifying the forum (not directly checked
 *   but part of path)
 * @param props.forumThreadId - The UUID identifying the forum thread
 * @param props.forumPostId - The UUID identifying the forum post to update
 * @param props.body - The update payload containing fields to update
 * @returns The complete updated forum post entity as per API contract
 * @throws {Error} If the forum post doesn't exist, the thread ID mismatches, or
 *   authorized user is not the author
 */
export async function putenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadIdForumPostsForumPostId(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  forumPostId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumPost.IUpdate;
}): Promise<IEnterpriseLmsForumPost> {
  const { corporateLearner, forumThreadId, forumPostId, body } = props;

  const existingPost =
    await MyGlobal.prisma.enterprise_lms_forum_posts.findUnique({
      where: { id: forumPostId },
    });

  if (!existingPost) {
    throw new Error("Forum post not found");
  }

  if (existingPost.thread_id !== forumThreadId) {
    throw new Error("Forum thread ID mismatch");
  }

  if (existingPost.author_id !== corporateLearner.id) {
    throw new Error("Unauthorized: Only the author can update the forum post");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.enterprise_lms_forum_posts.update({
    where: { id: forumPostId },
    data: {
      thread_id: body.thread_id ?? undefined,
      author_id: body.author_id ?? undefined,
      body: body.body ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    thread_id: updated.thread_id as string & tags.Format<"uuid">,
    author_id: updated.author_id as string & tags.Format<"uuid">,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
