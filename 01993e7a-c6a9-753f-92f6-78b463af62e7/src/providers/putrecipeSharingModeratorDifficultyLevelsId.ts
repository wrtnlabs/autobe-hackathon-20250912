import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing difficulty level record by ID.
 *
 * Allows modification of the code, name, and description fields, maintaining
 * system classifications and enforcing unique code constraints. Requires
 * authorized moderator role.
 *
 * @param props - Contains moderator payload, difficulty level ID, and update
 *   body
 * @param props.moderator - The authenticated moderator performing the update
 * @param props.id - UUID of the difficulty level to update
 * @param props.body - Update data for the difficulty level
 * @returns The updated difficulty level entity
 * @throws {Error} If the difficulty level does not exist
 * @throws {Error} If the code provided already exists on another record
 */
export async function putrecipeSharingModeratorDifficultyLevelsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingDifficultyLevels.IUpdate;
}): Promise<IRecipeSharingDifficultyLevels> {
  const { moderator, id, body } = props;

  // Fetch the existing difficulty level
  const existing =
    await MyGlobal.prisma.recipe_sharing_difficulty_levels.findUniqueOrThrow({
      where: { id },
    });

  // Check if code uniqueness violated if code is changed
  if (
    body.code !== undefined &&
    body.code !== null &&
    body.code !== existing.code
  ) {
    const codeExists =
      await MyGlobal.prisma.recipe_sharing_difficulty_levels.findFirst({
        where: { code: body.code },
      });
    if (codeExists) {
      throw new Error(`Difficulty level code '${body.code}' already exists.`);
    }
  }

  // Prepare update data, skipping undefined fields
  const updated = await MyGlobal.prisma.recipe_sharing_difficulty_levels.update(
    {
      where: { id },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        description:
          body.description === undefined
            ? undefined
            : (body.description ?? null),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
