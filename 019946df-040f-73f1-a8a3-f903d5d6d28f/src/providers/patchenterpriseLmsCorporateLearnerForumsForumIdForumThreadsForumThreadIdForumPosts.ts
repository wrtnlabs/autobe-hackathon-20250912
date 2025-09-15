import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";
import { IPageIEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForumPost";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve forum posts within a forum thread.
 *
 * Retrieves a paginated list of forum posts belonging to a specific forum
 * thread within a forum. Applies filters for author, body content, creation and
 * update dates, and sorts by allowed fields. Ensures soft-deleted posts are
 * excluded.
 *
 * Authorization is verified by confirming the forum thread belongs to the
 * forum.
 *
 * @param props - Contains corporateLearner authorization, forumId,
 *   forumThreadId, and filter body
 * @returns Paginated list of forum posts matching the criteria
 * @throws Error if the forum thread does not exist or if access is denied
 */
export async function patchenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadIdForumPosts(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumPost.IRequest;
}): Promise<IPageIEnterpriseLmsForumPost> {
  const { corporateLearner, forumId, forumThreadId, body } = props;

  // Verify forum thread exists and belongs to the forum
  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
    where: {
      id: forumThreadId,
      forum_id: forumId,
      deleted_at: null,
    },
  });
  if (!thread) throw new Error("Forum thread not found or access denied");

  // Pagination setup with defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Parse sorting criteria; default to created_at desc
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const [sortField, sortOrder] = body.sort.trim().split(/\s+/);
    const allowedFields = ["created_at", "updated_at", "author_id"];
    if (allowedFields.includes(sortField)) {
      orderBy = {
        [sortField]: sortOrder === "asc" ? "asc" : "desc",
      };
    }
  }

  // Build where condition for query
  const whereCondition = {
    thread_id: forumThreadId,
    deleted_at: null,
    ...(body.author_id !== undefined &&
      body.author_id !== null && {
        author_id: body.author_id,
      }),
    ...(body.body !== undefined &&
      body.body !== null && {
        body: { contains: body.body },
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: {
          gte: body.created_at,
        },
      }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && {
        updated_at: {
          gte: body.updated_at,
        },
      }),
  };

  // Fetch posts and count total
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_forum_posts.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_forum_posts.count({ where: whereCondition }),
  ]);

  // Convert date fields to ISO string format
  const resultPosts = posts.map((post) => ({
    id: post.id,
    thread_id: post.thread_id,
    author_id: post.author_id,
    body: post.body,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  }));

  // Pagination calculation
  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  // Construct pagination object
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data: resultPosts,
  };
}
