import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing story TTS result (storyfield_ai_tts_results table).
 *
 * Allows a system administrator to update the metadata or regeneration output
 * of a TTS result belonging to any story. Supported updates include changing
 * dialect, updating source text, correcting audio file URI, or moving page
 * association. The operation verifies the TTS result exists, is not
 * soft-deleted, and belongs to the specified story. System admin authorization
 * is enforced.
 *
 * If the TTS record does not exist, is soft-deleted, or does not match the
 * story, an error is thrown. Only allowed fields are updated. All timestamps
 * are normalized to and returned as ISO 8601 strings. No native Date type or
 * assertions are used.
 *
 * @param props - The request properties
 * @param props.systemAdmin - The authenticated system admin user
 * @param props.storyId - The target story's unique identifier (UUID)
 * @param props.ttsResultId - The TTS result record ID (UUID)
 * @param props.body - Fields to update (see IStoryfieldAiTtsResult.IUpdate)
 * @returns The updated TTS result, per business API contract
 * @throws {Error} If the TTS result does not exist, is soft-deleted, or is not
 *   associated with the given story
 */
export async function putstoryfieldAiSystemAdminStoriesStoryIdTtsResultsTtsResultId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  ttsResultId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTtsResult.IUpdate;
}): Promise<IStoryfieldAiTtsResult> {
  const { systemAdmin, storyId, ttsResultId, body } = props;

  // Step 1: Fetch and validate the TTS result record
  const tts = await MyGlobal.prisma.storyfield_ai_tts_results.findFirst({
    where: {
      id: ttsResultId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!tts) {
    throw new Error(
      "TTS result not found or is soft-deleted, or does not belong to target story",
    );
  }
  // Step 2: Perform the update; only update fields provided
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.storyfield_ai_tts_results.update({
    where: { id: ttsResultId },
    data: {
      tts_audio_uri: body.tts_audio_uri ?? undefined,
      source_text: body.source_text ?? undefined,
      dialect: body.dialect ?? undefined,
      storyfield_ai_story_page_id:
        body.storyfield_ai_story_page_id ?? undefined,
      updated_at: now,
    },
  });

  // Step 3: Assemble and return the result in strict API contract
  return {
    id: updated.id,
    storyfield_ai_story_id: updated.storyfield_ai_story_id,
    storyfield_ai_story_page_id: updated.storyfield_ai_story_page_id ?? null,
    tts_audio_uri: updated.tts_audio_uri,
    source_text: updated.source_text,
    dialect: updated.dialect,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
