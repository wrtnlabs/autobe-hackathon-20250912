import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Erase (delete) an AI-generated story from storyfield_ai_stories (hard
 * delete).
 *
 * Permanently removes an AI-generated story from the system by hard-deleting
 * the record from the storyfield_ai_stories table. Only the story owner
 * (authenticated user) can erase their own stories with this operation.
 * Associated pages, images, and TTS results are deleted by CASCADE. Audit and
 * traceability requirements are enforced by ensuring failures are explicit.
 *
 * @param props - The operation arguments
 * @param props.authenticatedUser - The authenticated user performing the
 *   deletion (must be the story owner)
 * @param props.storyId - Unique identifier of the target story
 * @returns Void
 * @throws {Error} If the story does not exist, is already deleted, or is not
 *   owned by the authenticated user
 */
export async function deletestoryfieldAiAuthenticatedUserStoriesStoryId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { authenticatedUser, storyId } = props;

  // Find the story by ID and ensure it is not already soft-deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
      deleted_at: null,
    },
  });
  if (!story) {
    throw new Error("Story not found or already deleted");
  }
  // Only the owner may delete their own stories
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("You may only delete your own stories");
  }
  // Hard delete the story (CASCADE to associated resources)
  await MyGlobal.prisma.storyfield_ai_stories.delete({
    where: { id: storyId },
  });
}
