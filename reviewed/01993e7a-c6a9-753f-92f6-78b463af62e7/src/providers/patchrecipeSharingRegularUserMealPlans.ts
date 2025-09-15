import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlans";
import { IPageIRecipeSharingMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlans";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

export async function patchrecipeSharingRegularUserMealPlans(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingMealPlans.IRequest;
}): Promise<IPageIRecipeSharingMealPlans.ISummary> {
  const { regularUser, body } = props;

  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 10;

  const skip = (page - 1) * limit;

  const where = {
    owner_user_id: regularUser.id,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null &&
      body.name !== "" && {
        name: { contains: body.name },
      }),
  };

  const validSortFields = ["name", "created_at"];
  const sortBy =
    body.sortBy !== undefined &&
    body.sortBy !== null &&
    validSortFields.includes(body.sortBy)
      ? body.sortBy
      : "created_at";

  const sortOrder =
    body.sortOrder !== undefined &&
    body.sortOrder !== null &&
    (body.sortOrder === "asc" || body.sortOrder === "desc")
      ? body.sortOrder
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_meal_plans.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_meal_plans.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? null,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages > 0 ? pages : 1,
    },
    data,
  };
}
