import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Update a specific image's metadata in a story.
 *
 * This API operation allows the authenticated user (the story owner) to update
 * metadata fields (image URI, description, etc.) for a specific image belonging
 * to a fairy tale story. The update is restricted to the image's URI and/or
 * description, and only allowed if the requesting user is the original creator
 * (owner) of the story containing this image.
 *
 * The operation verifies:
 *
 * - The image exists and is not soft-deleted
 * - The image is associated with the specified story
 * - The story exists and is owned by the authenticated user
 *
 * Only allowed fields (image_uri, description) are updated. All update
 * timestamps are set for audit/compliance. Any attempt to update a
 * non-existent, unauthorized, or deleted image will result in a clear error. No
 * admin/system role elevation is permitted from this endpoint.
 *
 * @param props - Object containing all parameters
 * @param props.authenticatedUser - The active authenticatedUser session,
 *   represents the requesting verified user
 * @param props.storyId - The UUID of the parent story (must match the image's
 *   parent story)
 * @param props.imageId - The UUID of the specific image within the story to
 *   update
 * @param props.body - The metadata fields to update (image_uri, description)
 * @returns The updated story image object as IStoryfieldAiStoryImage (all audit
 *   and relational fields included)
 * @throws {Error} When the image does not exist, is deleted, or access is
 *   forbidden by business rules
 */
export async function putstoryfieldAiAuthenticatedUserStoriesStoryIdImagesImageId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryImage.IUpdate;
}): Promise<IStoryfieldAiStoryImage> {
  const { authenticatedUser, storyId, imageId, body } = props;

  // Step 1: Ensure the image exists, is linked to this story, and not soft-deleted
  const image = await MyGlobal.prisma.storyfield_ai_story_images.findFirst({
    where: {
      id: imageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new Error("Image not found or already deleted");
  }

  // Step 2: Fetch parent story, verify ownership
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: storyId },
  });
  if (!story) {
    throw new Error("Parent story not found");
  }
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Forbidden: Only the story owner can update this image");
  }

  // Step 3: Prepare update (only allowed fields, always update updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.storyfield_ai_story_images.update({
    where: { id: imageId },
    data: {
      ...(body.image_uri !== undefined ? { image_uri: body.image_uri } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      updated_at: now,
    },
  });

  // Step 4: Map to API DTO
  return {
    id: updated.id,
    storyfield_ai_story_id: updated.storyfield_ai_story_id,
    storyfield_ai_story_page_id:
      updated.storyfield_ai_story_page_id ?? undefined,
    image_uri: updated.image_uri,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
