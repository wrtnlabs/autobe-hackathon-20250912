import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Retrieve a specific story TTS result by ID (storyfield_ai_tts_results table)
 *
 * This endpoint returns the detailed information of a specific TTS
 * (Text-to-Speech) result linked to a generated story. The operation verifies
 * story ownership, soft deletion, and permission. Only the authenticated story
 * owner can access their results; soft-deleted records are inaccessible. All
 * access, denial, and error events are fully auditable.
 *
 * @param props - Operation parameters
 * @param props.authenticatedUser - Authenticated user context (must match story
 *   owner)
 * @param props.storyId - Target story's unique UUID
 * @param props.ttsResultId - The unique ID of the TTS result to retrieve (UUID)
 * @returns Detailed IStoryfieldAiTtsResult for the owner
 * @throws {Error} If the TTS result does not exist, does not belong to the
 *   story, is soft deleted, or the authenticated user is not the owner
 */
export async function getstoryfieldAiAuthenticatedUserStoriesStoryIdTtsResultsTtsResultId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  ttsResultId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiTtsResult> {
  const { authenticatedUser, storyId, ttsResultId } = props;
  // 1. Fetch the TTS result by ID
  const ttsResult = await MyGlobal.prisma.storyfield_ai_tts_results.findUnique({
    where: { id: ttsResultId },
  });
  if (!ttsResult) throw new Error("TTS result not found");
  // 2. Check TTS result is linked to the target story
  if (ttsResult.storyfield_ai_story_id !== storyId)
    throw new Error("TTS result does not belong to the specified story");
  // 3. Fetch parent story and confirm ownership
  const story = await MyGlobal.prisma.storyfield_ai_stories.findUnique({
    where: { id: ttsResult.storyfield_ai_story_id },
  });
  if (!story) throw new Error("Parent story not found");
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id)
    throw new Error("You do not have permission to access this TTS result");
  // 4. Check soft deletion
  if (ttsResult.deleted_at !== null && ttsResult.deleted_at !== undefined)
    throw new Error("TTS result has been deleted");

  // 5. Map all fields per DTO with correct types and conversions
  return {
    id: ttsResult.id,
    storyfield_ai_story_id: ttsResult.storyfield_ai_story_id,
    storyfield_ai_story_page_id:
      ttsResult.storyfield_ai_story_page_id ?? undefined,
    tts_audio_uri: ttsResult.tts_audio_uri,
    source_text: ttsResult.source_text,
    dialect: ttsResult.dialect,
    created_at: toISOStringSafe(ttsResult.created_at),
    updated_at: toISOStringSafe(ttsResult.updated_at),
    deleted_at:
      ttsResult.deleted_at !== null && ttsResult.deleted_at !== undefined
        ? toISOStringSafe(ttsResult.deleted_at)
        : undefined,
  };
}
