import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Create a new forum thread inside a specified forum.
 *
 * This endpoint allows an authenticated corporate learner to create a new
 * discussion thread under an existing forum within their tenant organization.
 *
 * Authorization ensures the forum exists and belongs to the learner's tenant.
 *
 * @param props - Object containing corporate learner payload, target forum ID,
 *   and thread creation body.
 * @param props.corporateLearner - Authenticated corporate learner making the
 *   request.
 * @param props.forumId - UUID of the target forum where the thread will be
 *   created.
 * @param props.body - Payload containing thread details complying with
 *   IEnterpriseLmsForumThread.ICreate.
 * @returns The newly created forum thread with all properties populated.
 * @throws {Error} When the specified forum does not exist or is not accessible
 *   by the user.
 */
export async function postenterpriseLmsCorporateLearnerForumsForumIdForumThreads(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  const { corporateLearner, forumId, body } = props;

  const forum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: {
      id: forumId,
      tenant_id: corporateLearner.tenant_id,
      deleted_at: null,
    },
  });

  if (!forum) throw new Error("Forum not found");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      forum_id: forumId,
      author_id: corporateLearner.id,
      title: body.title,
      body: body.body ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
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
