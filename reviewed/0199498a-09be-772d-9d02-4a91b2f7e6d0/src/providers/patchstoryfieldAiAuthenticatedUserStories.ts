import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { IPageIStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStory";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Retrieve a paginated and filtered index of AI-generated stories
 * (storyfield_ai_stories table).
 *
 * This endpoint returns a paginated and filterable list of AI-generated stories
 * created by the authenticated user. Supports advanced filtering by title
 * (partial match), language, creation/update date ranges, and soft-deletion
 * status. Pagination is supported with sane defaults (page=1, limit=10) and a
 * maximum page size limit. Only the current authenticated user's stories are
 * returned; admin/privilege escalation is not supported in this function. All
 * date/datetime values are returned in ISO 8601 format as strings. Related
 * child records (pages, images, TTS results) are not included here and must be
 * fetched via related endpoints.
 *
 * @param props - The operation props object.
 * @param props.authenticatedUser - AuthenticateduserPayload representing the
 *   current authenticated user (must be non-deleted).
 * @param props.body - IStoryfieldAiStory.IRequest containing filter and
 *   pagination parameters for the index.
 * @returns A paginated list of matching stories (IPageIStoryfieldAiStory),
 *   including per-page metadata and all business compliance fields on each
 *   story.
 * @throws Error if unauthorized access or filter malformation occurs (should
 *   not happen if decorators/guards are in place).
 */
export async function patchstoryfieldAiAuthenticatedUserStories(props: {
  authenticatedUser: AuthenticateduserPayload;
  body: IStoryfieldAiStory.IRequest;
}): Promise<IPageIStoryfieldAiStory> {
  const { authenticatedUser, body } = props;
  // Pagination defaults and normalization
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build dynamic where clause for Prisma query
  const where: Record<string, unknown> = {
    storyfield_ai_authenticateduser_id: authenticatedUser.id,
    ...(body.deleted ? {} : { deleted_at: null }),
    ...(body.title !== undefined &&
      body.title !== null && {
        title: { contains: body.title },
      }),
    ...(body.language !== undefined &&
      body.language !== null && {
        language: body.language,
      }),
    ...((body.created_at_from !== undefined ||
      body.created_at_to !== undefined) && {
      created_at: {
        ...(body.created_at_from !== undefined && {
          gte: body.created_at_from,
        }),
        ...(body.created_at_to !== undefined && { lte: body.created_at_to }),
      },
    }),
    ...((body.updated_at_from !== undefined ||
      body.updated_at_to !== undefined) && {
      updated_at: {
        ...(body.updated_at_from !== undefined && {
          gte: body.updated_at_from,
        }),
        ...(body.updated_at_to !== undefined && { lte: body.updated_at_to }),
      },
    }),
  };

  // Fetch results and total count in parallel
  const [stories, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_stories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_stories.count({ where }),
  ]);

  // Map results to IStoryfieldAiStory structure, ensuring all date/datetime values are correct
  const data = stories.map((s) => ({
    id: s.id,
    storyfield_ai_authenticateduser_id: s.storyfield_ai_authenticateduser_id,
    title: s.title,
    main_plot:
      s.main_plot !== null && s.main_plot !== undefined
        ? s.main_plot
        : undefined,
    language: s.language,
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
    deleted_at:
      s.deleted_at !== null && s.deleted_at !== undefined
        ? toISOStringSafe(s.deleted_at)
        : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
