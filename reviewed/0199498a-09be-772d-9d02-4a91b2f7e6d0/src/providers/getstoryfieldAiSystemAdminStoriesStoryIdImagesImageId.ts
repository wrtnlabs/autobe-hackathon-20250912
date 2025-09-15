import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific story image by ID, cross-checking against parent story,
 * for detail viewing and edit review.
 *
 * This endpoint fetches the full metadata and S3 URI of a specific image
 * attached to a story, referencing the record in the storyfield_ai_story_images
 * table via both the parent story's UUID and the image's UUID.
 *
 * Only a system administrator may request this detailed image information. The
 * routine verifies that both the story and the image are not soft-deleted, that
 * the image is genuinely owned by the identified story, and that all
 * referential links are intact. Standard error handling triggers if the story
 * or image are missing, soft-deleted, or mismatched.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.storyId - The parent story's UUID (must belong to image)
 * @param props.imageId - The UUID of the image to retrieve in detail
 * @returns The image resource and all associated metadata, suitable for
 *   editing, moderation, or audit review
 * @throws {Error} When the story or image does not exist, is soft-deleted, or
 *   is mismatched
 */
export async function getstoryfieldAiSystemAdminStoriesStoryIdImagesImageId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiStoryImage> {
  // 1. Confirm the parent story exists and is not soft-deleted.
  await MyGlobal.prisma.storyfield_ai_stories.findFirstOrThrow({
    where: {
      id: props.storyId,
      deleted_at: null,
    },
  });

  // 2. Retrieve the image, ensuring it is not soft deleted and belongs to the provided story.
  const image =
    await MyGlobal.prisma.storyfield_ai_story_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        storyfield_ai_story_id: props.storyId,
        deleted_at: null,
      },
    });

  // 3. Map DB fields to the DTO, converting date fields and handling optional/nullable properties.
  return {
    id: image.id,
    storyfield_ai_story_id: image.storyfield_ai_story_id,
    storyfield_ai_story_page_id: image.storyfield_ai_story_page_id ?? undefined,
    image_uri: image.image_uri,
    description: image.description ?? undefined,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at:
      image.deleted_at !== null && image.deleted_at !== undefined
        ? toISOStringSafe(image.deleted_at)
        : undefined,
  };
}
