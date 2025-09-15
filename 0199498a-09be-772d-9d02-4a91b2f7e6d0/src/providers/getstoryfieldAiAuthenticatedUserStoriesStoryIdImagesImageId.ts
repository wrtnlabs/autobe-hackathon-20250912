import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Retrieve a specific story image by ID, cross-checking against parent story,
 * for detail viewing and edit review (storyfield_ai_story_images table).
 *
 * This operation fetches the full metadata and S3 URI of a specific image
 * attached to a story, referencing the record in the storyfield_ai_story_images
 * table via both the parent story's UUID and the image's UUID. It is designed
 * for situations that require deep review of illustration details, advanced
 * editing workflows, or compliance oversight.
 *
 * Strict access control is enforced: only the authenticated owner of the story
 * may request this detailed image information. The system verifies that both
 * the story and the image are not soft-deleted, that the image is owned by the
 * specified story, and that all referential links are intact.
 *
 * @param props - Object containing authenticated user payload, storyId (UUID),
 *   and imageId (UUID).
 * @returns Complete story image details including S3 URI, metadata, and
 *   description.
 * @throws {Error} If the image or parent story does not exist, is soft-deleted,
 *   or does not belong to the user.
 * @field props.authenticatedUser - The authenticated story user (must own the story).
 * @field props.storyId - UUID of the parent story that the image should belong to.
 * @field props.imageId - UUID of the image to be retrieved.
 */
export async function getstoryfieldAiAuthenticatedUserStoriesStoryIdImagesImageId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiStoryImage> {
  const { authenticatedUser, storyId, imageId } = props;

  // 1. Fetch the image by ID, parent story, and ensure not soft-deleted
  const image = await MyGlobal.prisma.storyfield_ai_story_images.findFirst({
    where: {
      id: imageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new Error("Image not found or deleted");
  }

  // 2. Fetch the parent story (ensure not soft-deleted)
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
      deleted_at: null,
    },
  });
  if (!story) {
    throw new Error("Parent story not found or deleted");
  }

  // 3. Ownership check: only the story owner may access
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Unauthorized: You are not the story owner");
  }

  // 4. Map fields to DTO, handling date-time and optional/nullable
  return {
    id: image.id,
    storyfield_ai_story_id: image.storyfield_ai_story_id,
    storyfield_ai_story_page_id: image.storyfield_ai_story_page_id ?? undefined,
    image_uri: image.image_uri,
    description: image.description ?? undefined,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at: image.deleted_at ? toISOStringSafe(image.deleted_at) : null,
  };
}
