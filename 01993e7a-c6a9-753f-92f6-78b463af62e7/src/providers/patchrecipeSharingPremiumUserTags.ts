import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";
import { IPageIRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingTags";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Search and retrieve a paginated list of recipe tags for premium users.
 *
 * This endpoint provides filtering by tag name using substring matching,
 * supports pagination with page and limit parameters, and allows sorting the
 * results by tag name ascending or descending.
 *
 * Soft deleted tags are excluded by filtering deleted_at to null.
 *
 * @param props - Object containing premiumUser authentication and request body
 * @param props.premiumUser - Authenticated premium user payload
 * @param props.body - Search and pagination criteria for tags
 * @returns Paginated summary list of tags matching the search criteria
 * @throws {Error} Any database errors or unexpected failures
 */
export async function patchrecipeSharingPremiumUserTags(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingTags.IRequest;
}): Promise<IPageIRecipeSharingTags.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deleted_at: null,
  };

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  const orderBy =
    body.sort && body.sort.length > 0
      ? body.sort.startsWith("-")
        ? { name: "desc" }
        : { name: "asc" }
      : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_tags.findMany({
      where,
      select: { id: true, name: true },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.recipe_sharing_tags.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((tag) => ({
      id: tag.id,
      name: tag.name,
    })),
  };
}
