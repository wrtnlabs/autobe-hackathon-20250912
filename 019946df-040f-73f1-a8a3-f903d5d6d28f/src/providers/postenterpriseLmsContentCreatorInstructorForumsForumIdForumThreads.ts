import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new forum thread inside the forum identified by 'forumId'.
 *
 * This operation allows an authenticated content creator instructor to add a
 * new discussion thread to a specified forum within their tenant's enterprise
 * LMS environment.
 *
 * It validates the existence of the target forum and links the created thread
 * with the author ID.
 *
 * All timestamps are generated as ISO 8601 strings.
 *
 * @param props - Object containing the content creator instructor information,
 *   forum ID, and thread creation data.
 * @param props.contentCreatorInstructor - The authenticated content creator
 *   instructor payload.
 * @param props.forumId - The UUID identifying the forum where the thread will
 *   be created.
 * @param props.body - The data for the forum thread creation, includes title
 *   and optional body.
 * @returns The created forum thread data conforming to
 *   IEnterpriseLmsForumThread.
 * @throws {Error} When the specified forum does not exist.
 */
export async function postenterpriseLmsContentCreatorInstructorForumsForumIdForumThreads(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.ICreate;
}): Promise<IEnterpriseLmsForumThread> {
  const { contentCreatorInstructor, forumId, body } = props;

  const forum = await MyGlobal.prisma.enterprise_lms_forums.findFirst({
    where: {
      id: forumId,
      deleted_at: null,
    },
  });
  if (!forum) throw new Error("Forum not found");

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_forum_threads.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      forum_id: forumId,
      author_id: contentCreatorInstructor.id,
      title: body.title,
      body: body.body ?? undefined,
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
    body: created.body ?? undefined,
    created_at: created.created_at
      ? toISOStringSafe(created.created_at)
      : ("" as string & tags.Format<"date-time">),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : ("" as string & tags.Format<"date-time">),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
