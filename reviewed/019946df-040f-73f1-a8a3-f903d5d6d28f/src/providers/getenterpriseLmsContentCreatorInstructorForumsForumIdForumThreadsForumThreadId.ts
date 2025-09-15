import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Retrieves detailed information of a forum thread by ID, ensuring multi-tenant
 * access control for the content creator/instructor role.
 *
 * This operation fetches the forum thread from the database using the provided
 * forumId and forumThreadId, verifying that the requesting user belongs to the
 * same tenant as the forum to enforce data isolation.
 *
 * @param props - Object containing the contentCreatorInstructor payload,
 *   forumId, and forumThreadId path parameters.
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor user payload.
 * @param props.forumId - UUID of the forum containing the thread.
 * @param props.forumThreadId - UUID of the forum thread to retrieve.
 * @returns The forum thread details including title, body, timestamps, and
 *   deletion status.
 * @throws {Error} If the content creator/instructor or forum thread is not
 *   found or access is denied.
 */
export async function getenterpriseLmsContentCreatorInstructorForumsForumIdForumThreadsForumThreadId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsForumThread> {
  const { contentCreatorInstructor, forumId, forumThreadId } = props;

  // Fetch the content creator instructor tenant id to enforce multi-tenant isolation
  const creatorRecord =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUnique({
      where: { id: contentCreatorInstructor.id },
      select: { tenant_id: true },
    });

  if (!creatorRecord) {
    throw new Error("Content Creator Instructor not found");
  }

  // Fetch the forum thread and validate tenant ownership
  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
    where: {
      id: forumThreadId,
      forum_id: forumId,
      deleted_at: null,
      forum: { tenant_id: creatorRecord.tenant_id },
    },
  });

  if (!thread) {
    throw new Error("Forum thread not found or access denied");
  }

  return {
    id: thread.id,
    forum_id: thread.forum_id,
    author_id: thread.author_id,
    title: thread.title,
    body: thread.body ?? undefined,
    created_at: toISOStringSafe(thread.created_at),
    updated_at: toISOStringSafe(thread.updated_at),
    deleted_at: thread.deleted_at
      ? toISOStringSafe(thread.deleted_at)
      : undefined,
  };
}
