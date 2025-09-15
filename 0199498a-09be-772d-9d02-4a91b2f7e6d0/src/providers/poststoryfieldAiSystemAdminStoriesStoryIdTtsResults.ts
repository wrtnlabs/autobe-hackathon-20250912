import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new TTS (Text-to-Speech) result for a given story.
 *
 * This endpoint is used by system administrators to register a generated TTS
 * audio file for a specific story, or a specific page within a story, along
 * with relevant metadata. The system validates that the referenced story exists
 * and is active, ensures page-level correctness (if a page is specified), and
 * then records the TTS result with full traceability. Required fields are
 * validated, and audit/compliance rules enforced. Soft delete applies to all
 * relations.
 *
 * @param props - Parameters for the TTS result creation operation
 * @param props.systemAdmin - Authenticated system admin issuing the request
 * @param props.storyId - The UUID of the target story
 * @param props.body - Creation payload (audio URI, source text, dialect,
 *   per-page binding)
 * @returns The newly created IStoryfieldAiTtsResult object
 * @throws {Error} If the story does not exist or is soft-deleted
 * @throws {Error} If the story page does not exist, is soft-deleted, or does
 *   not belong to the story
 */
export async function poststoryfieldAiSystemAdminStoriesStoryIdTtsResults(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTtsResult.ICreate;
}): Promise<IStoryfieldAiTtsResult> {
  const { storyId, body } = props;

  // Validate referenced story exists and is active (not soft-deleted)
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: storyId, deleted_at: null },
  });
  if (!story) {
    throw new Error("Story not found or is soft-deleted");
  }

  // If storyfield_ai_story_page_id provided, validate correctness
  let pageId = body.storyfield_ai_story_page_id;
  if (pageId !== undefined && pageId !== null) {
    const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
      where: {
        id: pageId,
        storyfield_ai_story_id: storyId,
        deleted_at: null,
      },
    });
    if (!page) {
      throw new Error(
        "Story page not found, does not belong to story, or is soft-deleted",
      );
    }
  }

  const now = toISOStringSafe(new Date());
  // Insert the TTS result
  const tts = await MyGlobal.prisma.storyfield_ai_tts_results.create({
    data: {
      id: v4(),
      storyfield_ai_story_id: storyId,
      storyfield_ai_story_page_id: pageId ?? null,
      tts_audio_uri: body.tts_audio_uri,
      source_text: body.source_text,
      dialect: body.dialect,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Format output per DTO structure and type: proper string/date/optional/null handling
  return {
    id: tts.id,
    storyfield_ai_story_id: tts.storyfield_ai_story_id,
    storyfield_ai_story_page_id: tts.storyfield_ai_story_page_id ?? undefined,
    tts_audio_uri: tts.tts_audio_uri,
    source_text: tts.source_text,
    dialect: tts.dialect,
    created_at: tts.created_at,
    updated_at: tts.updated_at,
    deleted_at: tts.deleted_at ?? undefined,
  };
}
