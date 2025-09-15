import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update measurement unit by ID
 *
 * Updates the code, name, and abbreviation fields of an existing measurement
 * unit identified by its unique ID. Returns the full updated unit details.
 *
 * Authorization requires a valid regularUser payload.
 *
 * @param props - Object containing regularUser payload, unit ID, and update
 *   body
 * @param props.regularUser - Authenticated regular user
 * @param props.id - UUID of the measurement unit to update
 * @param props.body - Update data for the measurement unit (code, name,
 *   abbreviation)
 * @returns The updated measurement unit with all fields
 * @throws {Error} Throws if the unit ID does not exist
 */
export async function putrecipeSharingRegularUserUnitsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingUnits.IUpdate;
}): Promise<IRecipeSharingUnits> {
  const { regularUser, id, body } = props;

  const updated = await MyGlobal.prisma.recipe_sharing_units.update({
    where: { id },
    data: {
      code: body.code === null ? null : (body.code ?? undefined),
      name: body.name === null ? null : (body.name ?? undefined),
      abbreviation:
        body.abbreviation === null ? null : (body.abbreviation ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    abbreviation: updated.abbreviation ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
