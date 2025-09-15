import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Update an existing story TTS result (storyfield_ai_tts_results table)
 *
 * Enables the owner of a fairy tale story to modify a previously generated TTS
 * (Text-to-Speech) result. Permissible updates include correcting the dialect,
 * changing the page association, updating the source text for TTS regeneration,
 * or changing the audio file URI. This operation enforces authorization: only
 * the owner of the story may update TTS results for that story. Updates are
 * forbidden if the TTS result has been soft-deleted.
 *
 * Field validation ensures update input is not empty for required string fields
 * when provided. All changes are fully auditable, and the update timestamp is
 * always refreshed. Attempted modifications to deleted or unauthorized records
 * will throw errors.
 *
 * @param props - Contains authenticated user payload, target storyId,
 *   ttsResultId, and the update request body.
 * @param props.authenticatedUser - AuthenticateduserPayload; the verified,
 *   active user.
 * @param props.storyId - UUID of the parent story.
 * @param props.ttsResultId - UUID of the TTS result to update.
 * @param props.body - Partial update for TTS result
 *   (IStoryfieldAiTtsResult.IUpdate).
 * @returns The updated IStoryfieldAiTtsResult record reflecting the requested
 *   changes.
 * @throws {Error} If not found, not owner, already deleted, or invalid field
 *   values.
 */
export async function putstoryfieldAiAuthenticatedUserStoriesStoryIdTtsResultsTtsResultId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  ttsResultId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTtsResult.IUpdate;
}): Promise<IStoryfieldAiTtsResult> {
  const { authenticatedUser, storyId, ttsResultId, body } = props;
  // 1. Fetch the TTS result and ensure it exists, belongs to storyId, not soft-deleted
  const ttsResult = await MyGlobal.prisma.storyfield_ai_tts_results.findFirst({
    where: {
      id: ttsResultId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!ttsResult) {
    throw new Error(
      "TTS result does not exist, is soft-deleted, or does not belong to this story",
    );
  }
  // 2. Fetch parent story to verify ownership
  const story = await MyGlobal.prisma.storyfield_ai_stories.findUnique({
    where: { id: storyId },
    select: { storyfield_ai_authenticateduser_id: true },
  });
  if (!story) {
    throw new Error("Story not found");
  }
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Forbidden: Only the story owner may update TTS results");
  }
  // 3. Business validation: non-empty required fields if provided
  if (body.source_text !== undefined && body.source_text.trim().length === 0) {
    throw new Error("Field 'source_text' cannot be empty if updating");
  }
  if (body.dialect !== undefined && body.dialect.trim().length === 0) {
    throw new Error("Field 'dialect' cannot be empty if updating");
  }
  // 4. Build update fields object (only set fields which are present in body)
  const now = toISOStringSafe(new Date());
  const updateFields: {
    tts_audio_uri?: string;
    source_text?: string;
    dialect?: string;
    storyfield_ai_story_page_id?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = { updated_at: now };
  if (body.tts_audio_uri !== undefined) {
    updateFields.tts_audio_uri = body.tts_audio_uri;
  }
  if (body.source_text !== undefined) {
    updateFields.source_text = body.source_text;
  }
  if (body.dialect !== undefined) {
    updateFields.dialect = body.dialect;
  }
  if (body.storyfield_ai_story_page_id !== undefined) {
    updateFields.storyfield_ai_story_page_id = body.storyfield_ai_story_page_id;
  }
  // 5. Execute update
  const updated = await MyGlobal.prisma.storyfield_ai_tts_results.update({
    where: { id: ttsResultId },
    data: updateFields,
  });
  // 6. Return domain object, normalizing all date fields and proper null handling
  return {
    id: updated.id,
    storyfield_ai_story_id: updated.storyfield_ai_story_id,
    tts_audio_uri: updated.tts_audio_uri,
    source_text: updated.source_text,
    dialect: updated.dialect,
    storyfield_ai_story_page_id:
      updated.storyfield_ai_story_page_id ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
