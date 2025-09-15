import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Create a new page for a given storyId in storyfield_ai_story_pages (insert).
 *
 * Inserts a new story page into an existing AI-generated fairy tale. This
 * operation verifies that the story exists and that the requesting
 * authenticated user owns the story. The request data specifies the intended
 * page number and the text content. If the story or ownership validation fails,
 * an error is thrown. Upon successful creation, returns the full page record
 * including audit timestamps and soft deletion field.
 *
 * @param props - The input properties for the provider
 * @param props.authenticatedUser - The payload representing the authenticated
 *   user submitting this operation
 * @param props.storyId - The UUID of the parent story to which this page will
 *   be added
 * @param props.body - The request body defining the new page's content, with
 *   page_number and text
 * @returns The complete story page entity with metadata
 *   (IStoryfieldAiStoryPage)
 * @throws {Error} If the story does not exist, is soft-deleted, or the user is
 *   not the owner
 * @throws {Error} If the page_number already exists within the story (unique
 *   constraint violation)
 */
export async function poststoryfieldAiAuthenticatedUserStoriesStoryIdPages(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryPage.ICreate;
}): Promise<IStoryfieldAiStoryPage> {
  const { authenticatedUser, storyId, body } = props;
  // 1. Verify the story exists and belongs to the user (soft delete aware)
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
      deleted_at: null,
    },
  });
  if (!story) throw new Error("Story not found");
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("You are not authorized to add pages to this story");
  }

  // 2. Prepare audit timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 3. Create the new page, relying on DB constraint for unique page_number
  const created = await MyGlobal.prisma.storyfield_ai_story_pages.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      storyfield_ai_story_id: storyId,
      page_number: body.page_number,
      text: body.text,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Return response formatted to DTO (convert date fields to ISO string)
  return {
    id: created.id,
    storyfield_ai_story_id: created.storyfield_ai_story_id,
    page_number: created.page_number,
    text: created.text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null ? toISOStringSafe(created.deleted_at) : null,
  };
}
