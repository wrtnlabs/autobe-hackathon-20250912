import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Add an image to a specific fairy tale story.
 *
 * This operation allows an authenticated user to upload a new illustration
 * image to a specific fairy tale story they own or are authorized to access. It
 * operates on the storyfield_ai_story_images table, requiring the storyId of
 * the parent story. The image data is linked to the given story, and proper
 * authorization is enforced so only the story's owner or a system administrator
 * can add images. Soft deletion and content moderation features of the schema
 * are honored. All date/datetime values use string & tags.Format<'date-time'>;
 * UUIDs are generated via v4().
 *
 * @param props - The request parameters
 * @param props.authenticatedUser - AuthenticateduserPayload for current user
 *   (must own the story)
 * @param props.storyId - Unique identifier of the parent story
 * @param props.body - Image upload request payload: image URI, page link,
 *   optional description
 * @returns IStoryfieldAiStoryImage - The metadata for the newly created story
 *   image
 * @throws Error If the story does not exist or user is not authorized to add
 *   images
 */
export async function poststoryfieldAiAuthenticatedUserStoriesStoryIdImages(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryImage.ICreate;
}): Promise<IStoryfieldAiStoryImage> {
  const { authenticatedUser, storyId, body } = props;

  // Step 1: Verify the story exists and is not soft-deleted
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
  if (story === null) {
    throw new Error("Story not found");
  }
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Unauthorized: only the story owner can add images");
  }

  // Step 2: Insert new image with all required and optional fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.storyfield_ai_story_images.create({
    data: {
      id: v4(),
      storyfield_ai_story_id: storyId,
      storyfield_ai_story_page_id:
        body.storyfield_ai_story_page_id ?? undefined,
      image_uri: body.image_uri,
      description: body.description ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    storyfield_ai_story_id: created.storyfield_ai_story_id,
    storyfield_ai_story_page_id:
      created.storyfield_ai_story_page_id ?? undefined,
    image_uri: created.image_uri,
    description: created.description ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
