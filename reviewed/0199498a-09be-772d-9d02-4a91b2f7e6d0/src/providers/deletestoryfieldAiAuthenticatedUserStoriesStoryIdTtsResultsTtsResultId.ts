import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Soft-delete (erase) a story TTS result (storyfield_ai_tts_results table)
 *
 * This operation performs a soft deletion of a TTS (Text-to-Speech) result,
 * setting the deleted_at timestamp in the storyfield_ai_tts_results table. Only
 * the owner of the parent story (authenticated user) may erase a TTS result;
 * unauthorized access attempts are blocked and fully logged. Already deleted or
 * non-existent results trigger error responses suitable for audit.
 *
 * @param props - Object containing operation parameters
 * @param props.authenticatedUser - Authenticated user performing the operation
 * @param props.storyId - UUID of the parent story
 * @param props.ttsResultId - UUID of the TTS result to soft-delete
 * @returns Void
 * @throws {Error} If record does not exist, is already deleted, or the user is
 *   not the story owner
 */
export async function deletestoryfieldAiAuthenticatedUserStoriesStoryIdTtsResultsTtsResultId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  ttsResultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { authenticatedUser, storyId, ttsResultId } = props;

  // Fetch the TTS result for the given TTS ID, story ID, only if not previously deleted
  const ttsResult = await MyGlobal.prisma.storyfield_ai_tts_results.findFirst({
    where: {
      id: ttsResultId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
    include: {
      story: true,
    },
  });

  if (!ttsResult) {
    throw new Error(
      "TTS result not found, already deleted, or story mismatch.",
    );
  }

  if (
    ttsResult.story.storyfield_ai_authenticateduser_id !== authenticatedUser.id
  ) {
    throw new Error(
      "Forbidden: You do not own this TTS result's parent story.",
    );
  }

  // Set deleted_at to current time (soft delete)
  await MyGlobal.prisma.storyfield_ai_tts_results.update({
    where: { id: ttsResultId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No output required
  return;
}
