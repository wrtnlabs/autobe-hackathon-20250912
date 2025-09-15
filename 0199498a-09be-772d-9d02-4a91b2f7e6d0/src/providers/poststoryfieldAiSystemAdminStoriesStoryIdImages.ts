import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Add an image to a specific fairy tale story.
 *
 * Only callable by a system administrator. Validates that the parent story
 * exists and is not soft-deleted. Creates a new image record for the story with
 * all business-metadata, timestamps, and proper mapping of null/undefined for
 * optionals.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - System administrator payload
 * @param props.storyId - Target parent story UUID (must exist, not deleted)
 * @param props.body - Image creation payload (uri, description, page id)
 * @returns The created image record with all metadata as per
 *   IStoryfieldAiStoryImage
 * @throws {Error} If the target story does not exist or is soft-deleted
 */
export async function poststoryfieldAiSystemAdminStoriesStoryIdImages(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryImage.ICreate;
}): Promise<IStoryfieldAiStoryImage> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // Ensure parent story exists and is not soft-deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: props.storyId, deleted_at: null },
  });
  if (!story) {
    throw new Error("Story not found or has been deleted");
  }

  const created = await MyGlobal.prisma.storyfield_ai_story_images.create({
    data: {
      id,
      storyfield_ai_story_id: props.storyId,
      storyfield_ai_story_page_id:
        typeof props.body.storyfield_ai_story_page_id === "undefined"
          ? null
          : props.body.storyfield_ai_story_page_id,
      image_uri: props.body.image_uri,
      description:
        typeof props.body.description === "undefined"
          ? null
          : props.body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    storyfield_ai_story_id: created.storyfield_ai_story_id,
    storyfield_ai_story_page_id:
      created.storyfield_ai_story_page_id ?? undefined,
    image_uri: created.image_uri,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      typeof created.deleted_at !== "undefined" && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
