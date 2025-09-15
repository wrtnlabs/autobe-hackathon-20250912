import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Erase (delete) an AI-generated story from storyfield_ai_stories (hard
 * delete).
 *
 * This endpoint enables a system administrator to permanently remove any
 * AI-generated story from the StoryField AI platform. The operation performs a
 * hard delete action from the database, erasing the story record and all
 * associated pages, images, and TTS results via cascading deletes. It ensures
 * full compliance with administrative and GDPR policies on irrecoverable
 * content erasure.
 *
 * Authorization: This endpoint is restricted to authenticated system
 * administrators, who can delete any story regardless of ownership.
 *
 * If the target story does not exist or was already deleted, a clear error is
 * thrown. Soft delete fields are ignored; this is a true hard deletion at the
 * database level.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - Authenticated SystemadminPayload (required
 *   authorization)
 * @param props.storyId - Unique identifier of the story to erase
 * @returns Void
 * @throws {Error} When the target story does not exist or is already deleted
 */
export async function deletestoryfieldAiSystemAdminStoriesStoryId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check existence before attempting delete, for clear error reporting
  const found = await MyGlobal.prisma.storyfield_ai_stories.findUnique({
    where: { id: props.storyId },
    select: { id: true },
  });
  if (!found) throw new Error("Story does not exist or is already deleted");
  // Hard-delete story (CASCADE deletes children)
  await MyGlobal.prisma.storyfield_ai_stories.delete({
    where: { id: props.storyId },
  });
  // Optionally, insert an audit log of the deletion here if required by compliance
}
