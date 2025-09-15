import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Search and retrieve paginated list of content tags.
 *
 * This operation provides a paginated and searchable list of content tags used
 * to classify and organize learning content in the Enterprise LMS. It supports
 * filtering and pagination, enabling efficient content discovery and
 * management.
 *
 * The operation is accessible only to authorized users with roles of
 * organizationAdmin, contentCreatorInstructor, or systemAdmin.
 *
 * @param props - Object containing the authenticated contentCreatorInstructor
 *   and the request body with filtering and pagination parameters.
 * @param props.contentCreatorInstructor - Authenticated content creator or
 *   instructor.
 * @param props.body - Request body with filters and pagination settings.
 * @returns Paginated summary of content tags matching the criteria.
 * @throws Error - Throws on unexpected database errors or invalid parameters.
 */
export async function patchenterpriseLmsContentCreatorInstructorContentTags(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsContentTag.IRequest;
}): Promise<IPageIEnterpriseLmsContentTag.ISummary> {
  const { contentCreatorInstructor, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const whereConditionsOr: any[] = [];

  if (body.search !== undefined && body.search !== null) {
    whereConditionsOr.push({ code: { contains: body.search } });
    whereConditionsOr.push({ name: { contains: body.search } });
    whereConditionsOr.push({ description: { contains: body.search } });
  }

  const where: any = {
    ...(whereConditionsOr.length > 0 ? { OR: whereConditionsOr } : {}),
    ...(body.code !== undefined && body.code !== null
      ? { code: body.code }
      : {}),
    ...(body.name !== undefined && body.name !== null
      ? { name: { contains: body.name } }
      : {}),
    ...(body.description !== undefined && body.description !== null
      ? { description: { contains: body.description } }
      : {}),
  };

  const orderByField =
    body.order_by === "code" ||
    body.order_by === "name" ||
    body.order_by === "description"
      ? body.order_by
      : "code";

  const orderDirection =
    body.order_direction === "asc" || body.order_direction === "desc"
      ? body.order_direction
      : "asc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_tags.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: (page - 1) * limit,
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

  return {
    data: results.map((tag) => ({
      id: tag.id as string & tags.Format<"uuid">,
      code: tag.code,
      name: tag.name,
      description: tag.description ?? null,
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
