import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleterecipeSharingModeratorDifficultyLevelsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, id } = props;

  const existing =
    await MyGlobal.prisma.recipe_sharing_difficulty_levels.findFirst({
      where: {
        id,
      },
    });

  if (!existing) throw new Error("Difficulty level not found");

  await MyGlobal.prisma.recipe_sharing_difficulty_levels.delete({
    where: { id },
  });
}
