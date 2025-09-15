import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Creates a new TTS (Text-to-Speech) result for a specified story.
 *
 * Only the authenticated owner of the story can invoke this operation. The
 * endpoint validates story ownership, ensures the story is not soft-deleted,
 * and if a page ID is provided, checks that the page exists, belongs to the
 * specified story, and is not soft-deleted. Upon validation, a new TTS result
 * is inserted into the storyfield_ai_tts_results table, with all required
 * metadata and audit fields.
 *
 * @param props - Properties for the operation
 * @param props.authenticatedUser - The verified, active authenticated user
 *   (owner of the story)
 * @param props.storyId - The UUID of the story for which to create the TTS
 *   result
 * @param props.body - TTS parameters and metadata (audio URI, text, dialect,
 *   optional page ID)
 * @returns The newly created TTS result with full audit fields and associations
 * @throws {Error} If the user is not the story owner, the story does not exist
 *   or is soft-deleted, or the page ID is invalid
 */
export async function poststoryfieldAiAuthenticatedUserStoriesStoryIdTtsResults(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTtsResult.ICreate;
}): Promise<IStoryfieldAiTtsResult> {
  const { authenticatedUser, storyId, body } = props;

  // Validate: Story exists, is not soft-deleted, and is owned by the authenticated user
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
      deleted_at: null,
    },
    select: {
      id: true,
      storyfield_ai_authenticateduser_id: true,
    },
  });
  if (
    !story ||
    story.storyfield_ai_authenticateduser_id !== authenticatedUser.id
  ) {
    throw new Error("Unauthorized: You must be the owner of the story.");
  }

  // Validate optional: Page exists, belongs to this story, is not soft-deleted
  if (
    body.storyfield_ai_story_page_id !== undefined &&
    body.storyfield_ai_story_page_id !== null
  ) {
    const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
      where: {
        id: body.storyfield_ai_story_page_id,
        storyfield_ai_story_id: storyId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!page) {
      throw new Error(
        "Invalid story page: page does not exist, does not belong to story, or is deleted.",
      );
    }
  }

  // Prepare audit timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Insert new TTS result
  const created = await MyGlobal.prisma.storyfield_ai_tts_results.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      storyfield_ai_story_id: storyId,
      storyfield_ai_story_page_id:
        body.storyfield_ai_story_page_id !== undefined
          ? body.storyfield_ai_story_page_id
          : null,
      tts_audio_uri: body.tts_audio_uri,
      source_text: body.source_text,
      dialect: body.dialect,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    storyfield_ai_story_id: created.storyfield_ai_story_id,
    storyfield_ai_story_page_id: created.storyfield_ai_story_page_id ?? null,
    tts_audio_uri: created.tts_audio_uri,
    source_text: created.source_text,
    dialect: created.dialect,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
