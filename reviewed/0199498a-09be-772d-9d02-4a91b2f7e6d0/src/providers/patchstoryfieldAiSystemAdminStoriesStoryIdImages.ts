import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { IPageIStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryImage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filtered list of images for a specific user
 * story (storyfield_ai_story_images table).
 *
 * This operation returns all non-soft-deleted images tied to a specific
 * AI-generated story, supporting advanced filtering, sorting, and pagination.
 * Only system administrators are permitted. Filters include image description
 * substring match, associated story page, and creation date/time window.
 * Results are paginated and sorted by a whitelisted schema field. Each result
 * includes the image URI, optional description, and deletion timestamp,
 * matching the output contract.
 *
 * @param props - Properties for search
 * @param props.systemAdmin - Authenticated admin performing the operation
 * @param props.storyId - UUID of the target story whose images to retrieve
 * @param props.body - Request body containing filter, search, sort, and
 *   pagination options
 * @returns Paginated, filtered, and sorted images matching filters
 * @throws {Error} If story does not exist or the request is invalid
 */
export async function patchstoryfieldAiSystemAdminStoriesStoryIdImages(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryImage.IRequest;
}): Promise<IPageIStoryfieldAiStoryImage.ISummary> {
  const { systemAdmin, storyId, body } = props;

  // 1. Fetch and verify the story exists
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: { id: storyId },
    select: { id: true },
  });
  if (!story) throw new Error("Story not found");

  // 2. Allowed sort fields (schema-driven, no assertions)
  const allowedSortFields = ["created_at", "updated_at", "description"];
  let sortField = body.sort || "created_at";
  if (!allowedSortFields.includes(sortField)) sortField = "created_at";
  const direction = body.direction === "asc" ? "asc" : "desc";

  // 3. Pagination setup (defaults: page=1, limit=20); Number() for brand compatibility
  const pageRaw = body.page !== undefined && body.page !== null ? body.page : 1;
  const limitRaw =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // 4. Build where clause (only include if field present and non-null)
  const where = {
    storyfield_ai_story_id: storyId,
    deleted_at: null,
    ...(body.storyfield_ai_story_page_id !== undefined &&
    body.storyfield_ai_story_page_id !== null
      ? { storyfield_ai_story_page_id: body.storyfield_ai_story_page_id }
      : {}),
    ...(body.description_contains !== undefined &&
    body.description_contains !== null &&
    body.description_contains.length > 0
      ? { description: { contains: body.description_contains } }
      : {}),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // 5. Query data and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_story_images.findMany({
      where,
      orderBy: { [sortField]: direction },
      select: {
        id: true,
        image_uri: true,
        description: true,
        deleted_at: true,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_story_images.count({ where }),
  ]);

  // 6. Map DB rows to output summaries (conform to API contract; handle nullable/optional fields correctly)
  const data = rows.map((row) => {
    return {
      id: row.id,
      image_uri: row.image_uri,
      description: row.description ?? null,
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  // 7. Build paged result (use Number() to ensure brand compatibility; no as, no Date)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
