import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing story's metadata by ID (storyfield_ai_stories table).
 *
 * This endpoint allows a system administrator to modify the details of a given
 * AI-generated fairy tale by specifying its unique storyId. Fields permitted
 * for update include the story's title, main plot, and language.
 *
 * Soft-deleted stories (where deleted_at is set) cannot be updated and will be
 * rejected with an error. The audit field updated_at is always set to the
 * current operation timestamp. The function does not affect secondary entities
 * (pages, images, TTS). The operation is restricted to system admins.
 *
 * @param props - The operation parameters
 * @param props.systemAdmin - The authenticated system admin performing the
 *   update
 * @param props.storyId - Unique identifier (UUID) of the story to update
 * @param props.body - The update payload: fields to modify (title, main_plot,
 *   language)
 * @returns The updated story with revised metadata/audit fields
 * @throws {Error} If the story does not exist, is soft-deleted, or other update
 *   constraints are violated
 */
export async function putstoryfieldAiSystemAdminStoriesStoryId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStory.IUpdate;
}): Promise<IStoryfieldAiStory> {
  const { storyId, body } = props;

  // Step 1: Retrieve the story and ensure it exists and isn't soft-deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findUnique({
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

  if (story === null || story.deleted_at !== null) {
    throw new Error("Story not found or has been deleted");
  }

  // Step 2: Build update data object with only provided fields
  const updateInput: Partial<
    Pick<IStoryfieldAiStory, "title" | "main_plot" | "language"> & {
      updated_at: string & tags.Format<"date-time">;
    }
  > = {};
  if (body.title !== undefined) updateInput.title = body.title;
  if (body.main_plot !== undefined) updateInput.main_plot = body.main_plot;
  if (body.language !== undefined) updateInput.language = body.language;
  updateInput.updated_at = toISOStringSafe(new Date());

  // Step 3: Apply update operation
  const updated = await MyGlobal.prisma.storyfield_ai_stories.update({
    where: { id: storyId },
    data: updateInput,
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

  // Step 4: Map and return as IStoryfieldAiStory DTO
  return {
    id: updated.id,
    storyfield_ai_authenticateduser_id:
      updated.storyfield_ai_authenticateduser_id,
    title: updated.title,
    main_plot: updated.main_plot !== undefined ? updated.main_plot : undefined,
    language: updated.language,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
