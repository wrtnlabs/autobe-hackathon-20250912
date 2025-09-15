import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Retrieve the details of a specific page (storyfield_ai_story_pages) by
 * storyId and pageId.
 *
 * This endpoint allows an authenticated user to fetch the full details,
 * content, and audit metadata of a given story page within their own story.
 * Only the owner of the story may access its pages. Returns all business,
 * audit, and soft-delete metadata required for page-level reading, editing, or
 * moderation. Throws an error if the page or story does not exist, is
 * soft-deleted, or if the user does not own the story.
 *
 * @param props - Object containing all required parameters for the operation
 * @param props.authenticatedUser - The authenticated user making the request
 *   (must own the parent story)
 * @param props.storyId - The UUID of the parent story of the page
 * @param props.pageId - The UUID of the page to retrieve
 * @returns The detailed story page object
 * @throws {Error} If the page is not found, the story is missing, or the user
 *   lacks access rights
 */
export async function getstoryfieldAiAuthenticatedUserStoriesStoryIdPagesPageId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  pageId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiStoryPage> {
  const { authenticatedUser, storyId, pageId } = props;

  // Step 1: Fetch the page with required matching conditions and not soft-deleted
  const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
    where: {
      id: pageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!page) throw new Error("Page not found");

  // Step 2: Fetch the parent story and check ownership
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
    },
  });
  if (!story) throw new Error("Story not found");
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("You do not have access to this story page");
  }

  // Step 3: Map results to API DTO and convert date fields
  return {
    id: page.id,
    storyfield_ai_story_id: page.storyfield_ai_story_id,
    page_number: page.page_number,
    text: page.text,
    created_at: toISOStringSafe(page.created_at),
    updated_at: toISOStringSafe(page.updated_at),
    deleted_at:
      page.deleted_at !== undefined && page.deleted_at !== null
        ? toISOStringSafe(page.deleted_at)
        : undefined,
  };
}
