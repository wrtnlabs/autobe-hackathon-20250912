import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create new difficulty level
 *
 * Creates a new record in the recipe_sharing_difficulty_levels table with the
 * specified unique code, name, and optional description. Records created_at and
 * updated_at timestamps automatically.
 *
 * @param props - Object containing the moderator authentication and the request
 *   body for difficulty level creation.
 * @param props.moderator - The authenticated moderator making the request.
 * @param props.body - The data for the new difficulty level including code,
 *   name, and optional description.
 * @returns The newly created difficulty level record with full fields and
 *   timestamps.
 * @throws {Error} Propagates errors from database uniqueness violations or
 *   other failures.
 */
export async function postrecipeSharingModeratorDifficultyLevels(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingDifficultyLevels.ICreate;
}): Promise<IRecipeSharingDifficultyLevels> {
  const { moderator, body } = props;

  const currentTimestamp = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;

  const created = await MyGlobal.prisma.recipe_sharing_difficulty_levels.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
  };
}
