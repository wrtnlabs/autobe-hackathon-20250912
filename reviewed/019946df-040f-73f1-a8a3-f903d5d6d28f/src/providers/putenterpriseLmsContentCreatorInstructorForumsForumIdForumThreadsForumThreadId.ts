import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update a forum thread by ID within a forum.
 *
 * This function updates the details of a forum thread, ensuring that the
 * authenticated content creator instructor is the author and enforcing tenant
 * and forum ownership constraints.
 *
 * @param props - Object containing authorization, path parameters, and update
 *   body
 * @param props.contentCreatorInstructor - Authenticated user context with ID
 *   and type
 * @param props.forumId - The UUID of the forum containing the thread
 * @param props.forumThreadId - The UUID of the forum thread to update
 * @param props.body - The update payload for the forum thread
 * @returns The updated forum thread with all fields including timestamps
 * @throws {Error} If the forum thread is not found
 * @throws {Error} If the forum ID does not match the thread's forum
 * @throws {Error} If the authenticated user is not the author of the thread
 */
export async function putenterpriseLmsContentCreatorInstructorForumsForumIdForumThreadsForumThreadId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThread.IUpdate;
}): Promise<IEnterpriseLmsForumThread> {
  const { contentCreatorInstructor, forumId, forumThreadId, body } = props;

  // Find the existing forum thread by primary key
  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findUnique({
    where: { id: forumThreadId },
  });
  if (!thread) throw new Error("Forum thread not found");

  // Verify that the retrieved thread belongs to the specified forum
  if (thread.forum_id !== forumId) {
    throw new Error("Forum ID mismatch");
  }

  // Verify that the authenticated user is the author of the thread
  if (thread.author_id !== contentCreatorInstructor.id) {
    throw new Error("Unauthorized: You are not the author");
  }

  // Update the forum thread with provided fields
  const updated = await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      forum_id: body.forum_id ?? undefined,
      author_id: body.author_id ?? undefined,
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Construct and return the updated forum thread with all fields
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
