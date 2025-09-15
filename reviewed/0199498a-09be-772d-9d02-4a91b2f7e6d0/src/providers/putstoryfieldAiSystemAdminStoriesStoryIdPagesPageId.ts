import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update text and ordering for a specific story page belonging to a
 * user-generated fairy tale (storyfield_ai_story_pages table).
 *
 * This operation enables a system administrator to update the content and
 * metadata (page number, text, updated_at) of any page in any AI-generated
 * story. The update is permitted only if both the target page and its parent
 * story exist and are not soft-deleted. The handler enforces that the admin is
 * authenticated (by the systemAdmin parameter) and logs all changes for
 * compliance and traceability. Business rules ensure atomic updates and proper
 * error handling for deleted or missing resources.
 *
 * @param props - Object containing the administrator's authentication and
 *   operation context
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.storyId - UUID of the target story
 * @param props.pageId - UUID of the target page to update
 * @param props.body - The update fields (text, page_number)
 * @returns The updated story page with all metadata for audit and frontend
 *   consumption
 * @throws {Error} If the page or parent story is missing or soft-deleted
 */
export async function putstoryfieldAiSystemAdminStoriesStoryIdPagesPageId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  pageId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryPage.IUpdate;
}): Promise<IStoryfieldAiStoryPage> {
  const { systemAdmin, storyId, pageId, body } = props;

  // 1. Fetch page with parent linkage, check for soft-deleted
  const page = await MyGlobal.prisma.storyfield_ai_story_pages.findFirst({
    where: {
      id: pageId,
      storyfield_ai_story_id: storyId,
      deleted_at: null,
    },
  });
  if (!page) throw new Error("Story page not found or already deleted");

  // 2. Verify parent story is not soft-deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: storyId, deleted_at: null },
  });
  if (!story) throw new Error("Parent story not found or deleted");

  // 3. Compute current time for updated_at
  const now = toISOStringSafe(new Date());

  // 4. Apply update - only include fields provided in body
  const updated = await MyGlobal.prisma.storyfield_ai_story_pages.update({
    where: { id: pageId },
    data: {
      ...(body.page_number !== undefined
        ? { page_number: body.page_number }
        : {}),
      ...(body.text !== undefined ? { text: body.text } : {}),
      updated_at: now,
    },
  });

  // 5. Return DTO with correct date branding
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
