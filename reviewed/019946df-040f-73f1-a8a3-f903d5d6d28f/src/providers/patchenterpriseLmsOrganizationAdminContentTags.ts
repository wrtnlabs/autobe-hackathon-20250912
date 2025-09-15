import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated list of content tags.
 *
 * This operation allows organizationAdmin users to filter and paginate content
 * tags by code, name, description, and general search text.
 *
 * It returns a paginated summary list of content tags including id, code, name,
 * and optional description.
 *
 * @param props - Object containing organizationAdmin authentication and request
 *   body with filters.
 * @param props.organizationAdmin - Authenticated organizationAdmin user
 *   payload.
 * @param props.body - Filter and pagination parameters for content tags.
 * @returns Paginated summary response of content tags matching filters.
 * @throws {Error} Throws error if any unexpected database or logic failure
 *   occurs.
 */
export async function patchenterpriseLmsOrganizationAdminContentTags(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsContentTag.IRequest;
}): Promise<IPageIEnterpriseLmsContentTag.ISummary> {
  const { body } = props;

  // Normalize pagination values
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Fields allowed for sorting
  const validOrderFields = ["code", "name", "description"];
  const orderByField =
    body.order_by && validOrderFields.includes(body.order_by)
      ? body.order_by
      : "code";

  // Ascending or descending order
  const orderDirection = body.order_direction === "asc" ? "asc" : "desc";

  // Construct where clause
  const where: Record<string, any> = {};

  // If a general search term is provided, search code, name, or description
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  // Additional filters if provided
  if (body.code !== undefined && body.code !== null && body.code !== "") {
    where.code = { contains: body.code };
  }
  if (body.name !== undefined && body.name !== null && body.name !== "") {
    where.name = { contains: body.name };
  }
  if (
    body.description !== undefined &&
    body.description !== null &&
    body.description !== ""
  ) {
    where.description = { contains: body.description };
  }

  // Execute query and count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_tags.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_content_tags.count({ where }),
  ]);

  // Map to required summary type
  const data = results.map((tag) => ({
    id: tag.id as string & tags.Format<"uuid">,
    code: tag.code,
    name: tag.name,
    description: tag.description ?? undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
