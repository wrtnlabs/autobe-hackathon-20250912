import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a forum thread by ID within a forum.
 *
 * This operation updates a forum thread identified by 'forumThreadId' within a
 * forum identified by 'forumId' for an organization administrator user within
 * the same tenant.
 *
 * Authorization is verified by checking the organization admin's tenant
 * ownership against the forum's tenant.
 *
 * Only title and body are updated, and the updated_at timestamp is set to
 * current UTC.
 *
 * @param props - The parameters including organizationAdmin, forumId,
 *   forumThreadId, and update body.
 * @returns The updated forum thread data.
 * @throws {Error} When the forum or thread is not found or access is denied.
 */
export async function putenterpriseLmsOrganizationAdminForumsForumIdForumThreadsForumThreadId(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { organizationAdmin, forumId, forumThreadId, body } = props;

  // Fetch organizationAdmin DB entity to get tenant_id
  const orgAdminEntity =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  // Verify forum exists and belongs to the same tenant as organizationAdmin
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: {
      id: forumId,
      tenant_id: orgAdminEntity.tenant_id,
      deleted_at: null,
    },
  });
  if (!forum) throw new Error("Forum not found or access denied");

  // Verify forum thread exists and belongs to the forum
  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
    where: {
      id: forumThreadId,
      forum_id: forumId,
      deleted_at: null,
    },
  });
  if (!thread)
    throw new Error("Forum thread not found or does not belong to forum");

  // Prepare update data with updated_at timestamp
  const now = toISOStringSafe(new Date());

  const data: IEnterpriseLmsForumThread.IUpdate = {
    title: body.title ?? undefined,
    body: body.body ?? undefined,
    updated_at: now,
  };

  // Execute update
  const updated = await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: data,
  });

  // Return converted updated object with proper branding for dates
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
