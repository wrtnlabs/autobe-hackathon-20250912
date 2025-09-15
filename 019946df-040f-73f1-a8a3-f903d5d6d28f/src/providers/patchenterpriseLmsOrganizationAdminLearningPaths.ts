import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPath";
import { IPageIEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPath";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve enterprise learning paths for organization admin.
 *
 * Retrieves a paginated list of learning paths filtered by tenant scope, search
 * text, status, and sorted by requested fields.
 *
 * Only non-deleted learning paths are returned (deleted_at is null).
 *
 * @param props - Object containing organizationAdmin payload and request body
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   with id
 * @param props.body - Request body containing filtering and pagination
 *   parameters
 * @returns A paginated summary list of learning paths
 * @throws Error if organizationAdmin payload is missing tenant id
 */
export async function patchenterpriseLmsOrganizationAdminLearningPaths(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsLearningPath.IRequest;
}): Promise<IPageIEnterpriseLmsLearningPath.ISummary> {
  const { organizationAdmin, body } = props;

  // Extract tenant ID from organizationAdmin payload
  const tenantId = organizationAdmin.id;
  if (!tenantId) {
    throw new Error("Invalid organizationAdmin payload: missing tenant ID");
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where clause with tenant scoping and filters
  const whereClause = {
    tenant_id: tenantId,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { title: { contains: body.search } },
        ],
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
  };

  // Define orderBy clause
  const orderByField = body.orderBy ?? "created_at";
  const orderDirection = body.orderDirection ?? "desc";
  const validOrderFields = ["code", "title", "created_at", "updated_at"];

  const orderByClause = validOrderFields.includes(orderByField)
    ? { [orderByField]: orderDirection }
    : { created_at: "desc" };

  // Execute queries in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_learning_paths.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_learning_paths.count({
      where: whereClause,
    }),
  ]);

  // Map results to summary
  const data = results.map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    status: item.status,
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
