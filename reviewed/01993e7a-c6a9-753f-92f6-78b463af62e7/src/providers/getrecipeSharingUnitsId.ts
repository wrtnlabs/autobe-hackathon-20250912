import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

/**
 * Retrieve a specific measurement unit by its unique ID.
 *
 * This operation fetches detailed information about a measurement unit,
 * including code, full name, optional abbreviation, and audit timestamps.
 *
 * @param props - Object containing the unique identifier of the measurement
 *   unit.
 * @param props.id - UUID of the measurement unit to retrieve.
 * @returns The measurement unit data conforming to IRecipeSharingUnits.
 * @throws {Error} When no unit with the given ID is found.
 */
export async function getrecipeSharingUnitsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingUnits> {
  const unit = await MyGlobal.prisma.recipe_sharing_units.findUniqueOrThrow({
    where: { id: props.id },
    select: {
      id: true,
      code: true,
      name: true,
      abbreviation: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: unit.id,
    code: unit.code,
    name: unit.name,
    abbreviation: unit.abbreviation ?? undefined,
    created_at: toISOStringSafe(unit.created_at),
    updated_at: toISOStringSafe(unit.updated_at),
  };
}
