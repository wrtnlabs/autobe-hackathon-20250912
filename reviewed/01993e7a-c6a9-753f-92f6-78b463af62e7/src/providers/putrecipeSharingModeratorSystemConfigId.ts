import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update a system configuration entry by its unique identifier.
 *
 * This operation updates the 'value' and optional 'description' fields of the
 * system configuration, preserving creation and update timestamps
 * automatically. Access restricted to moderators with appropriate
 * authorization.
 *
 * @param props - Object containing:
 *
 *   - Moderator: authenticated moderator payload for authorization
 *   - Id: UUID string identifying the configuration entry to update
 *   - Body: partial update object for configuration fields
 *
 * @returns The updated system configuration entry with all relevant fields
 * @throws Error if the configuration does not exist
 */
export async function putrecipeSharingModeratorSystemConfigId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingSystemConfig.IUpdate;
}): Promise<IRecipeSharingSystemConfig> {
  const { moderator, id, body } = props;

  // Verify existence
  const existing =
    await MyGlobal.prisma.recipe_sharing_system_config.findUniqueOrThrow({
      where: { id },
    });

  // Update only provided fields
  const updated = await MyGlobal.prisma.recipe_sharing_system_config.update({
    where: { id },
    data: {
      ...(body.key !== undefined
        ? { key: body.key === null ? null : body.key }
        : {}),
      ...(body.value !== undefined
        ? { value: body.value === null ? null : body.value }
        : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return with ISO string conversion for dates
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
