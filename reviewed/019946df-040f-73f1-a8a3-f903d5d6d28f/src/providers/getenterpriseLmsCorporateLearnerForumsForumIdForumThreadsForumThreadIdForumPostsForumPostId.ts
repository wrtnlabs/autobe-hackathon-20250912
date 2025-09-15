import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

export async function getenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadIdForumPostsForumPostId(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  forumPostId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumPost> {
  const { corporateLearner, forumId, forumThreadId, forumPostId } = props;

  const post =
    await MyGlobal.prisma.enterprise_lms_forum_posts.findFirstOrThrow({
      where: {
        id: forumPostId,
        thread_id: forumThreadId,
      },
      include: {
        thread: {
          select: {
            forum_id: true,
          },
        },
      },
    });

  if (post.thread.forum_id !== forumId) {
    throw new Error("Forum post does not belong to the specified forum");
  }

  return {
    id: post.id,
    thread_id: post.thread_id,
    author_id: post.author_id,
    body: post.body,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  };
}
