import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a specific image's metadata in a story.
 *
 * This endpoint allows a system administrator to update metadata (such as S3
 * URI or accessibility description) for an image attached to a fairy tale
 * story, as identified by both the parent storyId and imageId. Only images
 * linked to the specified story, and not soft-deleted, may be updated.
 * Supported updates are limited to permitted fields: image_uri and description.
 * All modifications update the audit timestamp for traceability.
 *
 * Authorization: Only users with the systemAdmin role may perform this
 * operation. Any attempt to update a non-existent or soft-deleted image will
 * result in an error.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin performing the
 *   update
 * @param props.storyId - UUID of the parent story containing the image
 * @param props.imageId - UUID of the image to update
 * @param props.body - Patch object specifying allowed updates (image_uri,
 *   description)
 * @returns The updated story image, reflecting all changes and audit fields
 * @throws {Error} If the image does not exist, belongs to a different story, or
 *   is already deleted
 */
export async function putstoryfieldAiSystemAdminStoriesStoryIdImagesImageId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryImage.IUpdate;
}): Promise<IStoryfieldAiStoryImage> {
  const { storyId, imageId, body } = props;

  // Find image for this story that hasn't been soft-deleted
  const image = await MyGlobal.prisma.storyfield_ai_story_images.findFirst({
    where: {
      id: imageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new Error("Image not found or has been deleted");
  }

  // Always bump updated_at, update only allowed fields if provided
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.storyfield_ai_story_images.update({
    where: { id: imageId },
    data: {
      image_uri: body.image_uri !== undefined ? body.image_uri : undefined,
      description:
        body.description !== undefined ? body.description : undefined,
      updated_at: now,
    },
  });

  // Map result to IStoryfieldAiStoryImage per DTO (no unused/extra fields)
  return {
    id: updated.id,
    storyfield_ai_story_id: updated.storyfield_ai_story_id,
    storyfield_ai_story_page_id:
      updated.storyfield_ai_story_page_id !== null &&
      updated.storyfield_ai_story_page_id !== undefined
        ? updated.storyfield_ai_story_page_id
        : undefined,
    image_uri: updated.image_uri,
    description:
      updated.description !== undefined && updated.description !== null
        ? updated.description
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
