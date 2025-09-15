import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import { IPageIEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentLocalization";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve paginated list of content localizations for a content
 * item.
 *
 * Retrieves a filtered and paginated list of localized content versions
 * associated with the specified content item, supporting multi-language
 * management.
 *
 * Tenant isolation and authorization are enforced by checking the tenant
 * ownership of the content with the corporate learner's tenant ID.
 *
 * @param props - Object containing corporateLearner, contentId, and filtering
 *   body
 * @param props.corporateLearner - Authenticated corporate learner user with
 *   tenant id
 * @param props.contentId - UUID of the target content item
 * @param props.body - Pagination and filtering parameters for content
 *   localizations
 * @returns Paginated list of content localizations abiding by filters
 * @throws {Error} When content is not found or user is unauthorized
 */
export async function patchenterpriseLmsCorporateLearnerContentsContentIdContentLocalizations(props: {
  corporateLearner: CorporatelearnerPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentLocalization.IRequest;
}): Promise<IPageIEnterpriseLmsContentLocalization> {
  const { corporateLearner, contentId, body } = props;

  // Default pagination page and limit
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  // Verify tenant ownership of content
  const content = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id: contentId },
    select: { tenant_id: true },
  });

  if (!content || content.tenant_id !== corporateLearner.id) {
    throw new Error("Content not found or unauthorized access");
  }

  // Build where filter
  const whereFilter: {
    content_id: string & tags.Format<"uuid">;
    language_code?: string;
    OR?:
      | { localized_title: { contains: string } }[]
      | { localized_description: { contains: string } }[];
  } = {
    content_id: contentId,
  };

  if (body.language_code !== undefined && body.language_code !== null) {
    whereFilter.language_code = body.language_code;
  }

  if (body.search !== undefined && body.search !== null) {
    whereFilter.OR = [
      { localized_title: { contains: body.search } },
      { localized_description: { contains: body.search } },
    ];
  }

  // Validate and assign sort
  const validSortFields = [
    "localized_title",
    "created_at",
    "updated_at",
    "language_code",
  ];
  const sortBy = validSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Execute queries
  const [total, localizations] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_content_localizations.count({
      where: whereFilter,
    }),
    MyGlobal.prisma.enterprise_lms_content_localizations.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
  ]);

  // Map data with conversion
  const data: IEnterpriseLmsContentLocalization[] = localizations.map(
    (item) => ({
      id: item.id,
      content_id: item.content_id,
      language_code: item.language_code,
      localized_title:
        item.localized_title === undefined ? null : item.localized_title,
      localized_description:
        item.localized_description === undefined
          ? null
          : item.localized_description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    }),
  );

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
