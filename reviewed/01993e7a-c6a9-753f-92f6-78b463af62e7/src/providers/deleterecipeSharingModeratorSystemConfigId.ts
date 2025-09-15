import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Permanently delete a system configuration by ID.
 *
 * This operation irreversibly removes a system configuration record identified
 * by its unique ID. Access is restricted to moderators only.
 *
 * @param props - Request properties containing moderator info and system
 *   configuration ID
 * @param props.moderator - The authenticated moderator performing the operation
 * @param props.id - UUID of the system configuration entry to delete
 * @returns Void
 * @throws {Error} Throws if the system configuration entry does not exist
 * @throws {Error} Throws if moderator is not authorized (handled by decorator)
 */
export async function deleterecipeSharingModeratorSystemConfigId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, id } = props;

  // Verify existence of the record to provide clear error
  await MyGlobal.prisma.recipe_sharing_system_config.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_system_config.delete({
    where: { id },
  });
}
