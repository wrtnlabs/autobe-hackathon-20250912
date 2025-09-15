import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new forum thread in a forum
 *
 * This endpoint creates a new discussion thread inside the specified forum. It
 * requires the authenticated organizationAdmin user and the forumId path
 * parameter. The request body must include thread title and optionally a body.
 *
 * The operation enforces authorization by requiring organizationAdmin role and
 * ensures the target forum exists and is active.
 *
 * @param props - Properties required for creating the forum thread
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.forumId - UUID of the forum where the thread will be created
 * @param props.body - Thread creation data including title and optional body
 * @returns The newly created forum thread record
 * @throws {Error} When the target forum does not exist or is soft-deleted
 */
export async function postenterpriseLmsOrganizationAdminForumsForumIdForumThreads(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  // Generate new UUID for the forum thread
  const id = v4() as string & tags.Format<"uuid">;

  // Check existence and active status of the forum
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: props.forumId },
  });

  if (!forum || forum.deleted_at !== null) {
    throw new Error("Forum not found or has been deleted");
  }

  // Capture current timestamp in ISO string format
  const now = toISOStringSafe(new Date());

  // Create the new forum thread record
  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id,
      forum_id: props.forumId,
      author_id: props.organizationAdmin.id,
      title: props.body.title,
      body: props.body.body ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created thread, properly converting Date fields to string
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
