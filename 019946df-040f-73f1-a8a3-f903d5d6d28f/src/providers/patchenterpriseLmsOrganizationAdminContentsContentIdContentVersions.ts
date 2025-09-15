import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import { IPageIEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentVersion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a paginated list of content versions for a specific content
 *
 * Fetches content version snapshots for the given contentId, supporting search
 * filtering on title or description, pagination, and sorting. Requires
 * organizationAdmin authentication.
 *
 * @param props - The request parameters including the authenticated
 *   organization admin, contentId, and search body.
 * @returns Paginated summary list of content versions matching criteria.
 * @throws Error if database query fails or invalid parameters provided.
 */
export async function patchenterpriseLmsOrganizationAdminContentsContentIdContentVersions(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentVersion.IRequest;
}): Promise<IPageIEnterpriseLmsContentVersion.ISummary> {
  const { organizationAdmin, contentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    content_id: string & tags.Format<"uuid">;
    deleted_at: null;
    OR?:
      | { title: { contains: string } }[]
      | { description: { contains: string } }[];
  } = {
    content_id: contentId,
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { title: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };

  if (body.sort !== undefined && body.sort !== null && body.sort !== "") {
    const sortField = body.sort.replace(/^[-+]/, "");
    const order: "asc" | "desc" = body.sort.startsWith("-") ? "desc" : "asc";
    if (["title", "version_number", "created_at"].includes(sortField)) {
      orderBy = { [sortField]: order };
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_versions.findMany({
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
    }),
    MyGlobal.prisma.enterprise_lms_content_versions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      content_id: row.content_id,
      version_number: row.version_number,
      title: row.title,
      content_type: row.content_type,
      status: row.status,
      business_status: row.business_status,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
