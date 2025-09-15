import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete (deactivate) a specific story page in storyfield_ai_story_pages
 * for content removal, audit, or compliance.
 *
 * This operation allows a system administrator to perform a soft delete of a
 * specific page within an AI-generated fairy tale. It targets the
 * storyfield_ai_story_pages table, identified by both the parent story ID
 * (storyId) and the page ID (pageId).
 *
 * The action sets the target page's deleted_at timestamp, supporting regulatory
 * erasure, audit logging, and recovery workflows. Only a system administrator
 * (SystemadminPayload) may execute this operation. The page and its parent
 * story must both exist and must not already be soft-deleted. If any check
 * fails, an error is thrown.
 *
 * @param props - Object containing all parameters for the operation
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion
 * @param props.storyId - Unique identifier for the parent story (UUID)
 * @param props.pageId - Unique identifier for the page being deleted (UUID)
 * @returns Void (no response body)
 * @throws {Error} If the page or parent story does not exist, is already
 *   deleted, or other validation fails
 */
export async function deletestoryfieldAiSystemAdminStoriesStoryIdPagesPageId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  pageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the story page to ensure it exists and is not already deleted
  const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
    where: {
      id: props.pageId,
      storyfield_ai_story_id: props.storyId,
      deleted_at: null,
    },
  });
  if (!page) {
    throw new Error("Page not found or already deleted");
  }

  // Verify the parent story exists and is not deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: props.storyId,
      deleted_at: null,
    },
  });
  if (!story) {
    throw new Error("Parent story does not exist or is deleted");
  }

  // Soft-delete the page by setting the deleted_at timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.storyfield_ai_story_pages.update({
    where: { id: props.pageId },
    data: { deleted_at: deletedAt },
  });
}
