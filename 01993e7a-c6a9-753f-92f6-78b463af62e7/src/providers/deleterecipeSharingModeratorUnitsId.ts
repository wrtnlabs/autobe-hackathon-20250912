import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete unit of measure by ID.
 *
 * Permanently deletes a unit from the recipe_sharing_units table by its unique
 * UUID. Requires moderator authorization. Throws if the unit does not exist.
 *
 * @param props - Object containing moderator payload and unit ID
 * @param props.moderator - Authenticated moderator performing the deletion
 * @param props.id - UUID of the unit to delete
 * @throws {Error} Throws if unit with specified ID does not exist
 */
export async function deleterecipeSharingModeratorUnitsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, id } = props;

  // Verify existence of the unit; will throw if not found
  await MyGlobal.prisma.recipe_sharing_units.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_units.delete({
    where: { id },
  });
}
