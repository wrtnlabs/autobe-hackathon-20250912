import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Remove an image from a story (soft delete).
 *
 * This endpoint allows the story's owner (authenticatedUser) to remove an image
 * from a specific fairy tale story. It performs a soft delete by setting the
 * deleted_at field to the current timestamp in the storyfield_ai_story_images
 * table, ensuring recoverability and compliance.
 *
 * Authorization is strictly enforced: only the owner of the parent story may
 * perform this action. Attempts by unauthorized users, or to
 * non-existent/deleted images, result in clear errors. The operation is
 * idempotent; repeated calls will not fail if the image is already
 * soft-deleted.
 *
 * @param props - Props object containing:
 *
 *   - AuthenticatedUser: The authenticated user making the request
 *   - StoryId: Unique identifier of the parent story
 *   - ImageId: Unique identifier of the image to delete
 *
 * @returns Void
 * @throws {Error} If the image does not exist, is not part of the story, or if
 *   authorization fails
 */
export async function deletestoryfieldAiAuthenticatedUserStoriesStoryIdImagesImageId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { authenticatedUser, storyId, imageId } = props;

  // Step 1: Find the image (and its parent story owner)
  const image = await MyGlobal.prisma.storyfield_ai_story_images.findFirst({
    where: {
      id: imageId,
      storyfield_ai_story_id: storyId,
    },
    include: {
      story: true,
    },
  });
  if (!image) {
    throw new Error("Image not found or not part of the specified story");
  }

  // Step 2: Authorization - must be owner of story
  if (image.story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Forbidden: Only the story owner may delete this image");
  }

  // Step 3: Soft-delete (set deleted_at; idempotent if already set)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.storyfield_ai_story_images.update({
    where: {
      id: imageId,
    },
    data: {
      deleted_at: now,
    },
  });
  // No result returned; void
}
