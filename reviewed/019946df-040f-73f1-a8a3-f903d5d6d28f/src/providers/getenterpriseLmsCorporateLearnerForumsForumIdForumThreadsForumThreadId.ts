import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Get detailed information of a forum thread by ID
 *
 * This endpoint retrieves a forum thread by its unique ID within a specified
 * forum. It verifies that the accessing corporate learner belongs to the tenant
 * owning the forum, enforcing multi-tenant data isolation.
 *
 * @param props - Object containing corporateLearner payload and identifiers
 * @param props.corporateLearner - Authenticated corporate learner user
 * @param props.forumId - UUID of the target forum
 * @param props.forumThreadId - UUID of the target forum thread
 * @returns The requested forum thread details
 * @throws {Error} If forum thread is not found or access is unauthorized
 */
export async function getenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadId(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumThread> {
  const { corporateLearner, forumId, forumThreadId } = props;

  const foundThread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
      where: {
        id: forumThreadId,
        forum_id: forumId,
        deleted_at: null,
        forum: {
          tenant_id: corporateLearner.tenant_id,
        },
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
        forum: {
          select: {
            tenant_id: true,
          },
        },
      },
    });

  if (!foundThread) {
    throw new Error("Forum thread not found or access unauthorized.");
  }

  if (foundThread.forum.tenant_id !== corporateLearner.tenant_id) {
    throw new Error("Access denied: tenant mismatch.");
  }

  return {
    id: foundThread.id,
    forum_id: foundThread.forum_id,
    author_id: foundThread.author_id,
    title: foundThread.title,
    body: foundThread.body === null ? undefined : foundThread.body,
    created_at: toISOStringSafe(foundThread.created_at),
    updated_at: toISOStringSafe(foundThread.updated_at),
    deleted_at: foundThread.deleted_at
      ? toISOStringSafe(foundThread.deleted_at)
      : null,
  };
}
