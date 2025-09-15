import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import { IPageIStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryImage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Search and retrieve a paginated, filtered list of images for a specific user
 * story (storyfield_ai_story_images table).
 *
 * This operation returns a paginated, searchable list of non-deleted images
 * associated with a particular AI-generated story. Only the story's owner may
 * access this endpoint. Complex filters (by page, description, created_at
 * range), flexible sorting, and pagination are supported.
 *
 * @param props - Properties required for image search
 * @param props.authenticatedUser - The authenticated user (must match story
 *   ownership)
 * @param props.storyId - UUID of the target story
 * @param props.body - Filtering, sorting, and pagination request
 *   (IStoryfieldAiStoryImage.IRequest)
 * @returns Paginated and filtered summary result of images
 *   (IPageIStoryfieldAiStoryImage.ISummary)
 * @throws {Error} When the story does not exist or is not owned by the
 *   authenticated user
 */
export async function patchstoryfieldAiAuthenticatedUserStoriesStoryIdImages(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryImage.IRequest;
}): Promise<IPageIStoryfieldAiStoryImage.ISummary> {
  const { authenticatedUser, storyId, body } = props;

  // 1. Verify the story exists and is owned by the user
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
  if (
    !story ||
    story.storyfield_ai_authenticateduser_id !== authenticatedUser.id
  ) {
    throw new Error(
      "Unauthorized: You do not own this story or it does not exist",
    );
  }

  // 2. Build filter where clause for images
  const where: Record<string, unknown> = {
    storyfield_ai_story_id: storyId,
    deleted_at: null,
  };
  if (
    body.storyfield_ai_story_page_id !== undefined &&
    body.storyfield_ai_story_page_id !== null
  ) {
    where.storyfield_ai_story_page_id = body.storyfield_ai_story_page_id;
  }
  if (
    body.description_contains !== undefined &&
    body.description_contains !== null
  ) {
    where.description = { contains: body.description_contains };
  }
  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    where.created_at = {
      ...(body.created_at_from !== undefined &&
        body.created_at_from !== null && { gte: body.created_at_from }),
      ...(body.created_at_to !== undefined &&
        body.created_at_to !== null && { lte: body.created_at_to }),
    };
  }

  // 3. Sorting
  const availableSortFields = ["created_at", "updated_at"];
  const sortField = availableSortFields.includes(body.sort ?? "")
    ? (body.sort ?? "created_at")
    : "created_at";
  const sortDirection = body.direction === "asc" ? "asc" : "desc";

  // 4. Pagination calculation
  const page = body.page ?? 0;
  const limit = body.limit ?? 20;
  const skip = page * limit;

  // 5. Query images and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_story_images.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
      select: {
        id: true,
        image_uri: true,
        description: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.storyfield_ai_story_images.count({ where }),
  ]);

  // 6. Map each image to ISummary, preserving correct types
  const data = rows.map((row) => {
    return {
      id: row.id,
      image_uri: row.image_uri,
      description: row.description ?? undefined,
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  // 7. Pagination metadata, types resolved by inference
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
