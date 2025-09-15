import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new measurement unit for ingredient quantity specifications.
 *
 * This operation creates a new unit record in the recipe_sharing_units table.
 * It requires a unique code and name along with an optional abbreviation.
 * Timestamps for creation and update are set automatically.
 *
 * @param props - Object containing the authenticated regularUser and unit
 *   creation data
 * @param props.regularUser - The authenticated regular user performing the
 *   operation
 * @param props.body - The data for creating a new measurement unit
 * @returns The newly created measurement unit including generated id and
 *   timestamps
 * @throws {Prisma.PrismaClientKnownRequestError} When unique constraints fail
 *   or other Prisma errors occur
 */
export async function postrecipeSharingRegularUserUnits(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingUnits.ICreate;
}): Promise<IRecipeSharingUnits> {
  const { regularUser, body } = props;
  const now = toISOStringSafe(new Date());

  const result = await MyGlobal.prisma.recipe_sharing_units.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: body.code,
      name: body.name,
      abbreviation: body.abbreviation ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: result.id,
    code: result.code,
    name: result.name,
    abbreviation: result.abbreviation ?? null,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
