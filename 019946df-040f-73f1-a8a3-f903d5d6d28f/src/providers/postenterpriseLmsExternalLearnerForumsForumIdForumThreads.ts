import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Create a new forum thread in a forum
 *
 * This operation creates a new forum thread under the specified forum
 * identified by forumId. It associates the thread with the authenticated
 * external learner as author. The thread details include required title and
 * optional body content.
 *
 * Authorization is based on externalLearner role.
 *
 * @param props - The parameters for thread creation
 * @param props.externalLearner - The authenticated external learner user
 * @param props.forumId - The UUID of the forum where the thread will be created
 * @param props.body - The thread creation payload matching
 *   IEnterpriseLmsForumThread.ICreate
 * @returns The newly created forum thread
 * @throws {Error} If creation fails due to database or input errors
 */
export async function postenterpriseLmsExternalLearnerForumsForumIdForumThreads(props: {
  externalLearner: ExternallearnerPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  const { externalLearner, forumId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      forum_id: forumId,
      author_id: externalLearner.id,
      title: body.title,
      body: body.body ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    forum_id: created.forum_id,
    author_id: created.author_id,
    title: created.title,
    body: created.body ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
