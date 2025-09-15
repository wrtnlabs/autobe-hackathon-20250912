import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Soft-delete (deactivate) a specific story page in storyfield_ai_story_pages
 * for content removal, audit, or compliance.
 *
 * This operation allows an authenticated user to soft-delete a page from their
 * own story by setting its deleted_at timestamp. The page must not already be
 * deleted, and the parent story must not be deleted. Only the story's owner may
 * perform this operation.
 *
 * @param props - The function parameters.
 * @param props.authenticatedUser - AuthenticateduserPayload: Verified, active
 *   user making the request.
 * @param props.storyId - The UUID of the parent story.
 * @param props.pageId - The UUID of the target page within the story.
 * @returns Void
 * @throws {Error} If the page does not exist or is already deleted, or the
 *   parent story does not exist or is deleted, or if the user is not the
 *   owner.
 */
export async function deletestoryfieldAiAuthenticatedUserStoriesStoryIdPagesPageId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  pageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { authenticatedUser, storyId, pageId } = props;

  // Find the page: must match pageId + storyId, and not be deleted
  const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
    where: {
      id: pageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
    select: {
      id: true,
      storyfield_ai_story_id: true,
    },
  });

  if (!page) {
    throw new Error("Page not found or already deleted");
  }

  // Find the parent story: must not be deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: page.storyfield_ai_story_id,
      deleted_at: null,
    },
    select: {
      id: true,
      storyfield_ai_authenticateduser_id: true,
    },
  });

  if (!story) {
    throw new Error("Parent story not found or deleted");
  }

  if (story.storyfield_ai_authenticateduser_id !== authenticatedUser.id) {
    throw new Error("You do not have permission to delete this page");
  }

  // Soft-delete: set deleted_at; always use toISOStringSafe
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.storyfield_ai_story_pages.update({
    where: { id: pageId },
    data: { deleted_at: deletedAt },
  });
  // No return for void
}
