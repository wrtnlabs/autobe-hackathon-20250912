import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information for a specific AI-generated story by its ID.
 *
 * Retrieves the full detail view for a single story from the
 * storyfield_ai_stories table, including metadata, language, owner, and
 * audit/compliance fields. Only accessible to system administrators, this
 * endpoint allows admins to view both active and soft-deleted stories for
 * moderation, copyright, and compliance review.
 *
 * Soft-deleted stories (i.e., deleted_at set) are included in query results for
 * admins. Throws if the story does not exist.
 *
 * This operation does not return any child resources (pages, images, TTS)
 * directly; use related endpoints to fetch them if needed.
 *
 * @param props - Parameters for story retrieval
 * @param props.systemAdmin - The authenticated system admin performing the
 *   request
 * @param props.storyId - Unique story ID (UUID) to retrieve
 * @returns The detailed story record including all metadata, audit, and
 *   compliance fields
 * @throws {Error} If the story with the given ID does not exist
 */
export async function getstoryfieldAiSystemAdminStoriesStoryId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiStory> {
  const { storyId } = props;
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirstOrThrow({
    where: { id: storyId },
    select: {
      id: true,
      storyfield_ai_authenticateduser_id: true,
      title: true,
      main_plot: true,
      language: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: story.id,
    storyfield_ai_authenticateduser_id:
      story.storyfield_ai_authenticateduser_id,
    title: story.title,
    main_plot: story.main_plot ?? undefined,
    language: story.language,
    created_at: toISOStringSafe(story.created_at),
    updated_at: toISOStringSafe(story.updated_at),
    deleted_at:
      story.deleted_at !== null ? toISOStringSafe(story.deleted_at) : null,
  };
}
