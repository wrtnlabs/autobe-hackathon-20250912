import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Permanently deletes a Telegram API credential record from the database.
 *
 * This operation is restricted to administrators only. The deletion is
 * irreversible and removes the record entirely from the
 * telegram_file_downloader_telegram_api_credentials table using the provided
 * UUID.
 *
 * @param props - Object containing administrator authentication data and the ID
 *   of the Telegram API credential to delete.
 * @param props.administrator - Authenticated administrator performing the
 *   operation.
 * @param props.telegramApiCredentialId - UUID of the Telegram API credential to
 *   delete.
 * @returns Promise<void> - Resolves when deletion is complete.
 * @throws {Error} Throws if the specified credential does not exist.
 */
export async function deletetelegramFileDownloaderAdministratorTelegramApiCredentialsTelegramApiCredentialId(props: {
  administrator: AdministratorPayload;
  telegramApiCredentialId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { telegramApiCredentialId } = props;

  // Verify existence to provide clear error if not found
  await MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.findUniqueOrThrow(
    {
      where: {
        id: telegramApiCredentialId,
      },
    },
  );

  // Perform the hard delete
  await MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.delete(
    {
      where: {
        id: telegramApiCredentialId,
      },
    },
  );
}
