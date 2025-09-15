import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThreads";
import { IPageIEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForumThreads";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Search and retrieve paginated list of forum threads by forumId.
 *
 * Retrieves a paginated and optionally filtered list of forum threads under a
 * specified forum in the Enterprise LMS tenant context. Supports search,
 * sorting, and pagination parameters. Ensures only threads belonging to the
 * tenant's forum are returned.
 *
 * @param props - Parameters including authenticated contentCreatorInstructor,
 *   forum ID, and request body with filters.
 * @returns Paginated list of forum thread summaries containing id, forum_id,
 *   author_id, title, and created_at.
 * @throws {Error} Throws error if unauthorized or on unexpected failures.
 */
export async function patchenterpriseLmsContentCreatorInstructorForumsForumIdForumThreads(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThreads.IRequest;
}): Promise<IPageIEnterpriseLmsForumThreads.ISummary> {
  const { contentCreatorInstructor, forumId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  /** Allowed sortable fields to prevent Prisma errors */
  const allowedOrderFields = new Set(["title", "created_at", "updated_at"]);

  let orderByField = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";

  if (body.sort) {
    const parts = body.sort.trim().split(/\s+/);
    if (parts.length >= 1 && allowedOrderFields.has(parts[0])) {
      orderByField = parts[0];
      if (parts.length >= 2) {
        const direction = parts[1].toLowerCase();
        if (direction === "asc" || direction === "desc") {
          orderByDirection = direction;
        }
      }
    }
  }

  const whereConditions = {
    forum_id: forumId,
    deleted_at: null,
    forum: { tenant_id: contentCreatorInstructor.tenant_id },
  } as const;

  const searchCondition = body.search
    ? {
        OR: [
          { title: { contains: body.search } },
          { body: { contains: body.search } },
        ],
      }
    : {};

  const [threads, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_forum_threads.findMany({
      where: { ...whereConditions, ...searchCondition },
      select: {
        id: true,
        forum_id: true,
        author_id: true,
        title: true,
        created_at: true,
      },
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_forum_threads.count({
      where: { ...whereConditions, ...searchCondition },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: threads.map((thread) => ({
      id: thread.id,
      forum_id: thread.forum_id,
      author_id: thread.author_id,
      title: thread.title,
      created_at: toISOStringSafe(thread.created_at),
    })),
  };
}
