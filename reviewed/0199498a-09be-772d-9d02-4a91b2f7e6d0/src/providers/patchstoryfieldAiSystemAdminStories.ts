import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { IPageIStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated and filtered index of AI-generated stories
 * (storyfield_ai_stories table).
 *
 * Fetch a paginated, filterable list of AI-generated fairy tales belonging to
 * authenticated users. This endpoint allows flexible filtering and searching by
 * story title (partial matches), language, creation time range, updated time
 * range, and soft deletion status. Results include all relevant metadata and
 * pagination info. Only system admins can access all stories; access requires
 * systemAdmin authentication.
 *
 * @param props - The request object
 * @param props.systemAdmin - Authenticated system admin user making the request
 * @param props.body - Search, filter, and pagination options for story index
 * @returns Paginated list of matching stories with metadata, ownership, and key
 *   fields per page
 * @throws {Error} On unexpected database errors
 */
export async function patchstoryfieldAiSystemAdminStories(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiStory.IRequest;
}): Promise<IPageIStoryfieldAiStory> {
  const { body } = props;

  // Pagination settings — unwrap branding via Number(), fallback to defaults
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 10;
  const skip = (page - 1) * limit;

  // Build 'where' filter using only available schema fields and provided filters
  const where = {
    ...(body.title !== undefined && body.title !== null && body.title.length > 0
      ? { title: { contains: body.title } }
      : {}),
    ...(body.language !== undefined &&
    body.language !== null &&
    body.language.length > 0
      ? { language: body.language }
      : {}),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
            body.updated_at_from !== null
              ? { gte: body.updated_at_from }
              : {}),
            ...(body.updated_at_to !== undefined && body.updated_at_to !== null
              ? { lte: body.updated_at_to }
              : {}),
          },
        }
      : {}),
    // Soft-delete handling: deleted (true) => deleted_at not null, deleted (false or undefined) => deleted_at null
    ...(body.deleted !== undefined
      ? body.deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : { deleted_at: null }),
  };

  // Query stories and total count concurrently
  const [stories, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_stories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_stories.count({ where }),
  ]);

  // Map results to IStoryfieldAiStory[] with strict date conversion, null/undefined contract strictly enforced
  const data = stories.map((story) => {
    return {
      id: story.id,
      storyfield_ai_authenticateduser_id:
        story.storyfield_ai_authenticateduser_id,
      title: story.title,
      main_plot:
        story.main_plot !== undefined && story.main_plot !== null
          ? story.main_plot
          : undefined,
      language: story.language,
      created_at: toISOStringSafe(story.created_at),
      updated_at: toISOStringSafe(story.updated_at),
      deleted_at:
        story.deleted_at !== undefined && story.deleted_at !== null
          ? toISOStringSafe(story.deleted_at)
          : undefined,
    };
  });

  // Pagination metadata — all numbers properly branded for API contract
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(Number(total) / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
