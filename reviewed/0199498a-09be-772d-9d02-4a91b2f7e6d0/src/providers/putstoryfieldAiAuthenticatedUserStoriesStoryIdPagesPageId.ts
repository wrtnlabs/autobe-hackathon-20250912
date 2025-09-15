import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Updates the text and/or ordering metadata for a specific page in a
 * user-generated fairy tale.
 *
 * This operation allows the authenticated story owner to modify a page's
 * textual content and sequence (page number), provided both the page and its
 * parent story are not soft-deleted. Authorization/Ownership is enforced: only
 * the story's creator may update; all modifications are audited.
 *
 * @param props - Request data including authentication, story/page IDs, and
 *   update body
 * @param props.authenticatedUser - Payload for current authenticated user (must
 *   be story owner)
 * @param props.storyId - UUID for the parent story
 * @param props.pageId - UUID for the page
 * @param props.body - Partial update for text and/or page_number
 * @returns The updated page object with current metadata and audit fields
 * @throws {Error} If the page or parent story is not found or soft-deleted, or
 *   if the user is not owner
 */
export async function putstoryfieldAiAuthenticatedUserStoriesStoryIdPagesPageId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  pageId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryPage.IUpdate;
}): Promise<IStoryfieldAiStoryPage> {
  const { authenticatedUser, storyId, pageId, body } = props;

  // 1. Ensure the page exists and is not soft-deleted
  const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
    where: {
      id: pageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!page) {
    throw new Error("Page not found or already deleted");
  }

  // 2. Ensure the parent story exists and is not soft-deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
      deleted_at: null,
    },
  });
  if (!story) {
    throw new Error("Parent story not found or already deleted");
  }

  // 3. Validate ownership (authenticated user's id must match story creator)
  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("Unauthorized: Only story owner may update pages");
  }

  // 4. Update the page - only fields provided in body (partial update)
  const updated = await MyGlobal.prisma.storyfield_ai_story_pages.update({
    where: {
      id: pageId,
    },
    data: {
      page_number: body.page_number ?? undefined,
      text: body.text ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Return the updated page in API structure, enforcing correct date/time string types and nullable handling
  return {
    id: updated.id,
    storyfield_ai_story_id: updated.storyfield_ai_story_id,
    page_number: updated.page_number,
    text: updated.text,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
