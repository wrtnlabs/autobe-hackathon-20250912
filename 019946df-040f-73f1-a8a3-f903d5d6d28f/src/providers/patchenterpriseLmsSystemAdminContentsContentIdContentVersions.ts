import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import { IPageIEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves a paginated, filterable list of content version snapshots for a
 * specified content entity.
 *
 * This operation supports searching by title or description keywords,
 * pagination with page and limit, and sorting by version_number, created_at, or
 * title in ascending or descending order.
 *
 * Requires system administrator authorization.
 *
 * @param props - Parameters including system admin payload, content ID, and
 *   request body with filters
 * @returns Paginated summary list of content versions
 * @throws {Error} If database operations fail or if parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminContentsContentIdContentVersions(props: {
  systemAdmin: SystemadminPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentVersion.IRequest;
}): Promise<IPageIEnterpriseLmsContentVersion.ISummary> {
  const { systemAdmin, contentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    content_id: contentId,
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? {
          OR: [
            { title: { contains: body.search } },
            { description: { contains: body.search } },
          ],
        }
      : {}),
  };

  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const trimmed = body.sort.trim();
    const direction = trimmed.startsWith("-") ? "desc" : "asc";
    const field =
      trimmed.startsWith("+") || trimmed.startsWith("-")
        ? trimmed.substring(1)
        : trimmed;
    if (["version_number", "created_at", "title"].includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  const total = await MyGlobal.prisma.enterprise_lms_content_versions.count({
    where,
  });
  const results =
    await MyGlobal.prisma.enterprise_lms_content_versions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        content_id: true,
        version_number: true,
        title: true,
        content_type: true,
        status: true,
        business_status: true,
        created_at: true,
      },
    });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((x) => ({
      id: x.id as string & tags.Format<"uuid">,
      content_id: x.content_id as string & tags.Format<"uuid">,
      version_number: x.version_number as number & tags.Type<"int32">,
      title: x.title,
      content_type: x.content_type,
      status: x.status,
      business_status: x.business_status,
      created_at: toISOStringSafe(x.created_at),
    })),
  };
}
