import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";

/**
 * Get a difficulty level by ID.
 *
 * Retrieve detailed information of a specific difficulty level identified by
 * its ID. This operation provides all properties of the difficulty level
 * including its unique code, human-readable name, optional description, and
 * audit timestamps.
 *
 * @param props - Object containing the unique identifier of the difficulty
 *   level
 * @param props.id - UUID string uniquely identifying the difficulty level
 * @returns The difficulty level entity matching the provided ID
 * @throws {Error} If the difficulty level with the specified ID does not exist
 */
export async function getrecipeSharingDifficultyLevelsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingDifficultyLevels> {
  const { id } = props;
  const record =
    await MyGlobal.prisma.recipe_sharing_difficulty_levels.findUniqueOrThrow({
      where: { id },
    });
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
