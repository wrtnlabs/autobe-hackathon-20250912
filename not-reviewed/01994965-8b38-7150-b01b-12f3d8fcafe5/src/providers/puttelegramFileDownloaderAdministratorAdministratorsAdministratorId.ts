import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrators } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrators";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update details of an existing administrator user
 *
 * This function updates the administrator user identified by administratorId.
 * It supports updating email and password hash, maintaining business logic for
 * uniqueness and data integrity.
 *
 * Authorization is enforced through the provided administrator payload.
 *
 * @param props - Input parameters including authenticating administrator,
 *   administratorId, and update data
 * @returns The updated administrator user details
 * @throws {Error} When the target administrator does not exist
 * @throws {Error} When the new email is already used by another administrator
 */
export async function puttelegramFileDownloaderAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderAdministrators.IUpdate;
}): Promise<ITelegramFileDownloaderAdministrators> {
  const { administrator, administratorId, body } = props;

  // Verify the administrator exists and is active
  const existing =
    await MyGlobal.prisma.telegram_file_downloader_administrators.findFirst({
      where: { id: administratorId, deleted_at: null },
    });
  if (!existing) throw new Error("Administrator not found");

  // Check for email uniqueness conflict
  if (body.email !== undefined && body.email !== existing.email) {
    const conflict =
      await MyGlobal.prisma.telegram_file_downloader_administrators.findFirst({
        where: { email: body.email, deleted_at: null },
      });
    if (conflict) throw new Error("Email already in use");
  }

  // Set updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Perform update operation
  const updated =
    await MyGlobal.prisma.telegram_file_downloader_administrators.update({
      where: { id: administratorId },
      data: {
        email: body.email ?? undefined,
        password_hash: body.password_hash ?? undefined,
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
        updated_at: now,
      },
    });

  // Return updated administrator details with proper date formatting
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
