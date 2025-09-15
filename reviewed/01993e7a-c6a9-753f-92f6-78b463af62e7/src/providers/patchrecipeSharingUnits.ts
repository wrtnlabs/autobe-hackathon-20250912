import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";
import { IPageIRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUnits";

/**
 * Search and retrieve a filtered, paginated list of measurement units.
 *
 * This operation allows filtering units by code, name, and abbreviation with
 * partial matching. Supports pagination with default values.
 *
 * @param props - Object containing the request body with filters and pagination
 *   parameters
 * @param props.body - The request body adhering to IRecipeSharingUnits.IRequest
 *   structure
 * @returns A paginated summary list of measurement units
 * @throws {Error} If database query fails
 */
export async function patchrecipeSharingUnits(props: {
  body: IRecipeSharingUnits.IRequest;
}): Promise<IPageIRecipeSharingUnits.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  const skip = (page - 1) * limit;

  const where = {
    ...(body.code !== undefined &&
      body.code !== null && {
        code: { contains: body.code },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.abbreviation !== undefined &&
      body.abbreviation !== null && {
        abbreviation: { contains: body.abbreviation },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_units.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_units.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((u) => ({
      id: u.id,
      code: u.code,
      name: u.name,
      abbreviation: u.abbreviation ?? null,
    })),
  };
}
