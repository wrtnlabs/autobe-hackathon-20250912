import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";
import { IPageIRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and retrieve a list of recipe tags
 *
 * This endpoint allows authenticated regular users to query tags by name
 * substring filter with pagination and sorting support.
 *
 * @param props - The properties including authorization and request body
 * @param props.regularUser - Authorized regular user payload
 * @param props.body - Filter and pagination parameters
 * @returns Paginated list of tag summaries containing id and name
 */
export async function patchrecipeSharingRegularUserTags(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingTags.IRequest;
}): Promise<IPageIRecipeSharingTags.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {};
  if (body.name !== undefined && body.name !== null) {
    whereConditions.name = { contains: body.name };
  }

  const orderByField =
    body.sort && body.sort.startsWith("-") ? body.sort.substring(1) : body.sort;
  const orderDirection =
    body.sort && body.sort.startsWith("-") ? "desc" : "asc";

  const allowedSortFields = ["name", "created_at"];
  const orderBy = allowedSortFields.includes(orderByField as string)
    ? { [orderByField as string]: orderDirection }
    : { created_at: "desc" };

  const [tags, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_tags.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_tags.count({ where: whereConditions }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
    })),
  };
}
