import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves a paginated list of content tags used to classify content
 * materials.
 *
 * This operation supports search, filtering, and sorting to enable efficient
 * content discovery and management. Only authorized system administrators can
 * access this endpoint.
 *
 * @param props - Object containing systemAdmin payload for authorization and
 *   request body for filtering
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - Filter and pagination parameters for content tags
 * @returns A paginated summary list of content tags matching the criteria
 * @throws {Error} If any database operation fails or parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminContentTags(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsContentTag.IRequest;
}): Promise<IPageIEnterpriseLmsContentTag.ISummary> {
  const { systemAdmin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  if (body.code !== undefined && body.code !== null) {
    where.code = body.code;
  }

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  if (body.description !== undefined && body.description !== null) {
    where.description = { contains: body.description };
  }

  const allowedOrderFields = ["code", "name", "created_at", "updated_at"];
  let orderByField = "created_at";
  if (
    body.order_by !== undefined &&
    body.order_by !== null &&
    allowedOrderFields.includes(body.order_by)
  ) {
    orderByField = body.order_by;
  }

  let orderDirection: "asc" | "desc" = "desc";
  if (body.order_direction !== undefined && body.order_direction !== null) {
    const dir = body.order_direction.toLowerCase();
    if (dir === "asc" || dir === "desc") {
      orderDirection = dir;
    }
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_tags.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_content_tags.count({ where }),
  ]);

  const data = records.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description === null ? undefined : r.description,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
