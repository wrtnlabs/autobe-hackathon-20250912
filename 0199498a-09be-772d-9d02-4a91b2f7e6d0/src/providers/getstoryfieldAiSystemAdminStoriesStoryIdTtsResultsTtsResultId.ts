import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific story TTS result by ID (storyfield_ai_tts_results table)
 *
 * This operation allows system administrators to fetch the full details of a
 * TTS result attached to a story, with no ownership restriction. All date and
 * UUID types are handled per spec, and deleted/soft-deleted records remain
 * visible to admin for audit/compliance.
 *
 * @param props - Props containing the systemAdmin payload, storyId, and
 *   ttsResultId
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.storyId - UUID of the parent story to which the TTS result
 *   belongs
 * @param props.ttsResultId - UUID of the TTS result to retrieve
 * @returns The requested TTS result details
 * @throws {Error} If no matching TTS result exists for the story/ID combination
 */
export async function getstoryfieldAiSystemAdminStoriesStoryIdTtsResultsTtsResultId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  ttsResultId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiTtsResult> {
  const { storyId, ttsResultId } = props;
  const ttsResult = await MyGlobal.prisma.storyfield_ai_tts_results.findFirst({
    where: {
      id: ttsResultId,
      storyfield_ai_story_id: storyId,
    },
  });
  if (ttsResult === null) {
    throw new Error("TTS result not found");
  }
  return {
    id: ttsResult.id,
    storyfield_ai_story_id: ttsResult.storyfield_ai_story_id,
    storyfield_ai_story_page_id:
      ttsResult.storyfield_ai_story_page_id === null
        ? undefined
        : ttsResult.storyfield_ai_story_page_id,
    tts_audio_uri: ttsResult.tts_audio_uri,
    source_text: ttsResult.source_text,
    dialect: ttsResult.dialect,
    created_at: toISOStringSafe(ttsResult.created_at),
    updated_at: toISOStringSafe(ttsResult.updated_at),
    deleted_at:
      ttsResult.deleted_at === null
        ? undefined
        : toISOStringSafe(ttsResult.deleted_at),
  };
}
