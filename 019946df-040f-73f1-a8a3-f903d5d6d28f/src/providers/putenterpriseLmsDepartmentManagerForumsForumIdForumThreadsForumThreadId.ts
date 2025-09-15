import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Update a forum thread by ID within a forum.
 *
 * This endpoint allows a departmentManager to update certain fields of a forum
 * thread that belongs to a forum within their tenant. It enforces multi-tenant
 * security by verifying tenant ownership.
 *
 * @param props - Properties including authorization and parameters
 * @param props.departmentManager - The authenticated department manager making
 *   the request
 * @param props.forumId - UUID of the forum to which the thread belongs
 * @param props.forumThreadId - UUID of the forum thread to update
 * @param props.body - The update payload conforming to
 *   IEnterpriseLmsForumThread.IUpdate
 * @returns The updated forum thread data with all date fields normalized to ISO
 *   strings
 * @throws {Error} When the forum thread does not belong to the specified forum
 * @throws {Error} When the department manager is unauthorized to update the
 *   thread because of tenant mismatch
 * @throws {Prisma.PrismaClientKnownRequestError} When the forum thread or forum
 *   is not found
 */
export async function putenterpriseLmsDepartmentManagerForumsForumIdForumThreadsForumThreadId(props: {
  departmentManager: DepartmentmanagerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { departmentManager, forumId, forumThreadId, body } = props;

  // Find the forum thread and include forum relation
  const thread =
    await MyGlobal.prisma.enterprise_lms_forum_threads.findUniqueOrThrow({
      where: { id: forumThreadId },
    });

  if (thread.forum_id !== forumId) {
    throw new Error("Forum thread does not belong to the specified forum");
  }

  // Fetch the forum to check tenant owner
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUniqueOrThrow({
    where: { id: forumId },
  });

  if (forum.tenant_id !== departmentManager.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Prepare the updated_at timestamp
  const updated_at = toISOStringSafe(new Date());

  // Update the forum thread
  const updated = await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      forum_id: body.forum_id ?? undefined,
      author_id: body.author_id ?? undefined,
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: updated_at,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    forum_id: updated.forum_id,
    author_id: updated.author_id,
    title: updated.title,
    body: updated.body ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
