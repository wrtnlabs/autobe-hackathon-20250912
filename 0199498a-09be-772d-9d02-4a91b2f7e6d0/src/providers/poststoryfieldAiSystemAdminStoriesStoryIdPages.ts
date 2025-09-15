import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new page for a given storyId in storyfield_ai_story_pages (insert).
 *
 * Inserts a new story page to an existing AI-generated story. This operation
 * allows a system administrator to add, edit, or recover content pages for any
 * story in the service. All required audit fields and soft deletion logic are
 * enforced. Only accessible to verified admins. Duplicate (story_id,
 * page_number) is prevented.
 *
 * @param props - The operation properties
 * @param props.systemAdmin - Authenticated SystemadminPayload (authorization,
 *   audit trail)
 * @param props.storyId - The unique storyId (UUID) of the parent story
 * @param props.body - The page creation object with page_number and text
 * @returns IStoryfieldAiStoryPage - The created story page DTO (all audit
 *   fields)
 * @throws {Error} When the parent story doesn't exist or is soft-deleted
 * @throws {Error} When a duplicate page_number exists for this story
 */
export async function poststoryfieldAiSystemAdminStoriesStoryIdPages(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryPage.ICreate;
}): Promise<IStoryfieldAiStoryPage> {
  const { systemAdmin, storyId, body } = props;

  // Step 1: Verify the target story exists and is not soft-deleted
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: storyId, deleted_at: null },
  });
  if (!story) {
    throw new Error("Story not found or has been deleted");
  }

  // Step 2: Prepare immutable properties
  const page_id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 3: Attempt page insertion, handle unique constraint
  let created;
  try {
    created = await MyGlobal.prisma.storyfield_ai_story_pages.create({
      data: {
        id: page_id,
        storyfield_ai_story_id: storyId,
        page_number: body.page_number,
        text: body.text,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "A page with this page_number already exists in the story; duplicate page numbers are not allowed.",
      );
    }
    throw err;
  }

  // Step 4: Map Prisma entity to API DTO
  return {
    id: created.id,
    storyfield_ai_story_id: created.storyfield_ai_story_id,
    page_number: created.page_number,
    text: created.text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
