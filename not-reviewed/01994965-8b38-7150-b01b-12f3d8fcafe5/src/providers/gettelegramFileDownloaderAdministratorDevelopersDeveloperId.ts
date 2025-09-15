import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a developer user by ID.
 *
 * This operation fetches detailed information for a specified developer user by
 * their UUID. Only accessible by administrators.
 *
 * @param props - Object containing the authenticated administrator and the
 *   developer ID
 * @param props.administrator - The authenticated administrator user making the
 *   request
 * @param props.developerId - UUID of the developer user to retrieve
 * @returns The detailed developer user information as
 *   ITelegramFileDownloaderDeveloper
 * @throws {Error} Throws if the developer user does not exist
 */
export async function gettelegramFileDownloaderAdministratorDevelopersDeveloperId(props: {
  administrator: AdministratorPayload;
  developerId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderDeveloper> {
  const { administrator, developerId } = props;

  const developer =
    await MyGlobal.prisma.telegram_file_downloader_developers.findUniqueOrThrow(
      {
        where: { id: developerId },
      },
    );

  typia.assertGuard<string & tags.Format<"uuid">>(developer.id);

  return {
    id: developer.id,
    email: developer.email,
    password_hash: developer.password_hash,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at: developer.deleted_at
      ? toISOStringSafe(developer.deleted_at)
      : null,
  };
}
