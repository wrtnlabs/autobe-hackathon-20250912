import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThreads";
import { IPageIEnterpriseLmsForumThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForumThreads";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated list of forum threads by forumId.
 *
 * This operation retrieves a paginated and optionally filtered list of forum
 * threads under a specified forum in the Enterprise LMS tenant context. It
 * supports search, sorting, and pagination parameters to navigate potentially
 * large thread collections. The operation queries the
 * 'enterprise_lms_forum_threads' table filtering on the forum ID, enforcing
 * tenant data isolation and efficient retrieval of thread metadata.
 *
 * Authorization is granted to authenticated organization administrators within
 * the tenant.
 *
 * @param props - Object containing the authenticated organization
 *   administrator, the forum id to query, and the request body with pagination
 *   and filters.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload.
 * @param props.forumId - Unique identifier of the target forum.
 * @param props.body - Search and pagination parameters for forum threads
 *   filtering.
 * @returns Paginated list of forum thread summaries restricted to the forum and
 *   tenant.
 * @throws {Error} When forum is not found or deleted.
 * @throws {Error} When user is unauthorized due to tenant mismatch.
 */
export async function patchenterpriseLmsOrganizationAdminForumsForumIdForumThreads(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsForumThreads.IRequest;
}): Promise<IPageIEnterpriseLmsForumThreads.ISummary> {
  const { organizationAdmin, forumId, body } = props;

  // Normalize pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as unknown as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as unknown as number;
  const skip = (page - 1) * limit;

  // Fetch the forum to confirm it exists and get tenant_id
  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUniqueOrThrow({
    where: { id: forumId },
    select: { id: true, tenant_id: true, deleted_at: true },
  });

  if (forum.deleted_at !== null) throw new Error("Forum is deleted");

  // Verify that the organizationAdmin belongs to the same tenant
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true, deleted_at: true, status: true },
    });

  if (admin.tenant_id !== forum.tenant_id) {
    throw new Error("Unauthorized access: tenant mismatch");
  }

  if (admin.deleted_at !== null) {
    throw new Error("Unauthorized: account deleted");
  }

  if (admin.status !== "active") {
    throw new Error("Unauthorized: account inactive");
  }

  // Build where condition
  const whereCondition: any = {
    forum_id: forumId,
    deleted_at: null,
  };

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    whereCondition.OR = [
      { title: { contains: body.search } },
      { body: { contains: body.search } },
    ];
  }

  // Parse sort string
  let orderBy;
  if (typeof body.sort === "string" && body.sort.trim() !== "") {
    const [field, dir] = body.sort.split(" ", 2).map((s) => s.trim());
    const allowedFields = ["title", "created_at", "updated_at"];
    const allowedDirections = ["ASC", "DESC"];
    if (
      allowedFields.includes(field) &&
      allowedDirections.includes(dir.toUpperCase())
    ) {
      orderBy = { [field]: dir.toLowerCase() };
    } else {
      orderBy = { created_at: "desc" };
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  // Fetch threads and total count concurrently
  const [threads, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_forum_threads.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        forum_id: true,
        author_id: true,
        title: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_forum_threads.count({
      where: whereCondition,
    }),
  ]);

  // Map threads to summarized results
  const data: IEnterpriseLmsForumThreads.ISummary[] = threads.map((thread) => {
    return {
      id: thread.id as string & tags.Format<"uuid">,
      forum_id: thread.forum_id as string & tags.Format<"uuid">,
      author_id: thread.author_id as string & tags.Format<"uuid">,
      title: thread.title,
      created_at: toISOStringSafe(thread.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
