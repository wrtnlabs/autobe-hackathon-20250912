import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import { IPageIEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContents";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a filtered, paginated list of content items
 *
 * This endpoint allows corporate learners to query training content with
 * flexible filtering, keyword search, sorting, and pagination. Soft deleted
 * content is always excluded.
 *
 * @param props - Object containing authenticated corporateLearner and request
 *   body
 * @param props.corporateLearner - The authenticated corporate learner user
 * @param props.body - Search and pagination criteria for content filtering
 * @returns Paginated summary list matching search criteria
 * @throws {Error} On unexpected database errors or invalid sort fields
 */
export async function patchenterpriseLmsCorporateLearnerContents(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsContents.IRequest;
}): Promise<IPageIEnterpriseLmsContents.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "title",
    "status",
    "business_status",
    "content_type",
    "created_at",
    "updated_at",
  ];

  const sortField = allowedSortFields.includes(body.sort_field ?? "")
    ? (body.sort_field ?? "")
    : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  const whereCondition = {
    deleted_at: null,
    ...(body.tenant_id !== undefined &&
      body.tenant_id !== null && { tenant_id: body.tenant_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.content_type !== undefined &&
      body.content_type !== null && { content_type: body.content_type }),
    ...((body.title !== undefined && body.title !== null) ||
    (body.search !== undefined && body.search !== null)
      ? {
          OR: [
            ...(body.title !== undefined && body.title !== null
              ? [{ title: { contains: body.title } }]
              : []),
            ...(body.search !== undefined && body.search !== null
              ? [
                  { title: { contains: body.search } },
                  { description: { contains: body.search } },
                ]
              : []),
          ],
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_contents.findMany({
      where: whereCondition,
      orderBy: { [sortField]: sortDirection },
      skip: skip,
      take: limit,
      select: {
        id: true,
        tenant_id: true,
        title: true,
        content_type: true,
        status: true,
        business_status: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_contents.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((content) => ({
      id: content.id as string & tags.Format<"uuid">,
      tenant_id: content.tenant_id as string & tags.Format<"uuid">,
      title: content.title,
      content_type: content.content_type,
      status: content.status,
      business_status: content.business_status,
    })),
  };
}
