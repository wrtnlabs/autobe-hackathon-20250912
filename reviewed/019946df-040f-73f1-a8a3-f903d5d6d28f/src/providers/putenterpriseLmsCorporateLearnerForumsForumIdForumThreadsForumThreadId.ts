import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update a forum thread by ID within a forum.
 *
 * Update details of a forum thread specified by 'forumThreadId' within the
 * forum 'forumId'.
 *
 * Authorization is limited to the authoring corporate learner to ensure
 * multi-tenant security.
 *
 * @param props - Object containing authenticated corporate learner, forumId,
 *   forumThreadId, and update body.
 * @returns Updated forum thread object conforming to IEnterpriseLmsForumThread.
 * @throws Error if the thread is not found or the user is unauthorized to
 *   update.
 */
export async function putenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadId(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { corporateLearner, forumId, forumThreadId, body } = props;

  // Validate existence and ownership
  const existingThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirstOrThrow({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        author_id: corporateLearner.id,
        deleted_at: null,
      },
    });

  // Update with provided fields
  const updated = await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      forum_id: body.forum_id ?? undefined,
      author_id: body.author_id ?? undefined,
      title: body.title ?? undefined,
      body: body.body ?? null,
      created_at: body.created_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    forum_id: updated.forum_id,
    author_id: updated.author_id,
    title: updated.title,
    body: updated.body === null ? null : (updated.body ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
