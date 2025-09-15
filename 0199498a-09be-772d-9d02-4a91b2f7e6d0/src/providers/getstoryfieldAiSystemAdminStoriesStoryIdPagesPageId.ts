import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve the details of a specific page (storyfield_ai_story_pages) by
 * storyId and pageId.
 *
 * This operation allows a system administrator to access the full content and
 * metadata of a single page within any story for moderation or review. It
 * retrieves the page record matching both storyId and pageId, including text,
 * page number, and all audit/compliance fields (timestamps, soft delete
 * status).
 *
 * Authorization: Requires systemAdmin role. No ownership or user checks; admins
 * have full access for all stories/pages.
 *
 * Throws an Error if the specified pageId or storyId does not exist, or if the
 * page is missing. All operations comply with audit and content traceability
 * requirements.
 *
 * @param props - { systemAdmin: SystemadminPayload - The authenticated system
 *   administrator performing the operation. storyId: string &
 *   tags.Format<'uuid'> - The unique identifier of the parent story. pageId:
 *   string & tags.Format<'uuid'> - The unique identifier of the story page. }
 * @returns IStoryfieldAiStoryPage - Detailed page information with full text
 *   and audit metadata.
 * @throws {Error} If the page with provided storyId and pageId does not exist.
 */
export async function getstoryfieldAiSystemAdminStoriesStoryIdPagesPageId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  pageId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiStoryPage> {
  const { storyId, pageId } = props;
  const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
    where: {
      id: pageId,
      storyfield_ai_story_id: storyId,
    },
  });
  if (!page) {
    throw new Error("Page not found for the given storyId and pageId");
  }
  return {
    id: page.id,
    storyfield_ai_story_id: page.storyfield_ai_story_id,
    page_number: page.page_number,
    text: page.text,
    created_at: toISOStringSafe(page.created_at),
    updated_at: toISOStringSafe(page.updated_at),
    deleted_at: page.deleted_at ? toISOStringSafe(page.deleted_at) : undefined,
  };
}
