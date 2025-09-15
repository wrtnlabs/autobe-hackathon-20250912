import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Update an existing story's metadata by ID (storyfield_ai_stories table).
 *
 * Modifies the details of an existing AI-generated story, updating fields like
 * title, main plot, or language. Only the story's owner may perform the update.
 * Soft-deleted stories cannot be modified. The updated_at audit field is set to
 * the current timestamp. Duplicate titles per owner are disallowed. Returns the
 * complete updated record.
 *
 * @param props - Properties for update
 * @param props.authenticatedUser - Authenticated user performing the update.
 *   Only the owner may update their story.
 * @param props.storyId - The story's UUID to update
 * @param props.body - The fields to update (title, main_plot, language)
 * @returns The updated IStoryfieldAiStory DTO
 * @throws {Error} If story is not found, soft-deleted, forbidden, duplicate, or
 *   validation errors
 */
export async function putstoryfieldAiAuthenticatedUserStoriesStoryId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStory.IUpdate;
}): Promise<IStoryfieldAiStory> {
  const { authenticatedUser, storyId, body } = props;

  // Find and validate story ownership/active
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: storyId },
  });
  if (!story || story.deleted_at !== null) {
    throw new Error("Story not found or already deleted");
  }
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Forbidden: you do not own this story");
  }

  // Enforce unique title per user if title is updating
  if (body.title !== undefined && body.title !== story.title) {
    const isDuplicate = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
      where: {
        storyfield_ai_authenticateduser_id: authenticatedUser.id,
        title: body.title,
        deleted_at: null,
        id: { not: storyId },
      },
    });
    if (isDuplicate) {
      throw new Error(
        "A story by this owner with the same title already exists",
      );
    }
  }

  // Build update payload
  const updatePayload: {
    title?: string;
    main_plot?: string | null;
    language?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.main_plot !== undefined ? { main_plot: body.main_plot } : {}),
    ...(body.language !== undefined ? { language: body.language } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.storyfield_ai_stories.update({
    where: { id: storyId },
    data: updatePayload,
  });

  return {
    id: updated.id,
    storyfield_ai_authenticateduser_id:
      updated.storyfield_ai_authenticateduser_id,
    title: updated.title,
    main_plot:
      typeof updated.main_plot === "undefined" ? undefined : updated.main_plot,
    language: updated.language,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
