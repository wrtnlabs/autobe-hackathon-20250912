import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Create a new forum post in a forum thread
 *
 * This operation inserts a new forum post associated with a specific forum
 * thread. The post is created by an authorized corporate learner with the
 * provided content body.
 *
 * The function verifies that the forum thread exists and belongs to the
 * specified forum. It ensures that the author_id in the request body matches
 * the authenticated corporate learner's id.
 *
 * @param props - The properties needed for creating the forum post
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.forumId - UUID of the target forum
 * @param props.forumThreadId - UUID of the target forum thread
 * @param props.body - Forum post creation payload
 * @returns The newly created forum post with full details including timestamps
 * @throws {Error} If the forum thread does not exist or does not belong to the
 *   specified forum
 * @throws {Error} If the author_id in the body does not match the authenticated
 *   user
 */
export async function postenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadIdForumPosts(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumPost.ICreate;
}): Promise<IEnterpriseLmsForumPost> {
  const { corporateLearner, forumId, forumThreadId, body } = props;

  const forumThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findUnique({
      where: { id: forumThreadId },
    });

  if (!forumThread) {
    throw new Error("Forum thread not found");
  }

  if (forumThread.forum_id !== forumId) {
    throw new Error("Forum thread does not belong to the specified forum");
  }

  if (body.author_id !== corporateLearner.id) {
    throw new Error("Unauthorized: author_id mismatch");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_forum_posts.create({
    data: {
      id,
      thread_id: body.thread_id,
      author_id: body.author_id,
      body: body.body,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    thread_id: created.thread_id as string & tags.Format<"uuid">,
    author_id: created.author_id as string & tags.Format<"uuid">,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? undefined,
  };
}
