import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPath";
import { IPageIEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPath";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Search and retrieve enterprise learning paths
 *
 * Retrieves a paginated list of learning paths filtered by search criteria,
 * tenant scope, status, and supports sorting and pagination. Only authorized
 * content creator instructors can access learning paths belonging to their
 * tenant.
 *
 * @param props - Object containing authenticated content creator instructor and
 *   search request
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor payload
 * @param props.body - Filtering, pagination, and sorting criteria
 * @returns Paginated list of learning path summaries for the tenant
 * @throws {Error} When unauthorized user attempts to access data outside tenant
 *   scope
 */
export async function patchenterpriseLmsContentCreatorInstructorLearningPaths(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsLearningPath.IRequest;
}): Promise<IPageIEnterpriseLmsLearningPath.ISummary> {
  const { contentCreatorInstructor, body } = props;

  // Validate and set default pagination values
  const page = body.page === null || body.page === undefined ? 1 : body.page;
  const limit =
    body.limit === null || body.limit === undefined ? 100 : body.limit;

  // Allowed order fields
  const allowedOrderByFields = ["code", "title", "created_at", "updated_at"];
  const orderByField =
    body.orderBy && allowedOrderByFields.includes(body.orderBy)
      ? body.orderBy
      : "created_at";

  // Allowed order directions
  const allowedOrderDirections = ["asc", "desc"];
  const orderDirection =
    body.orderDirection && allowedOrderDirections.includes(body.orderDirection)
      ? body.orderDirection
      : "desc";

  // Build where clause scoped to tenant
  const where: {
    tenant_id: string & tags.Format<"uuid">;
    deleted_at: null;
    status?: string | null;
    OR?: { code: { contains: string } }[];
  } = {
    tenant_id: contentCreatorInstructor.id,
    deleted_at: null,
  };

  // Apply status filter if provided
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  // Apply search filter on code or title
  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { code: { contains: body.search } },
      { title: { contains: body.search } },
    ];
  }

  // Fetch total records count and paginated records
  const [total, items] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_learning_paths.count({ where }),
    MyGlobal.prisma.enterprise_lms_learning_paths.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      status: item.status,
    })),
  };
}
