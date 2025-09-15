import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTelegramApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredential";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update details of a Telegram API credential
 *
 * This API operation enables modification of existing Telegram API credential
 * records by authorized administrators. The target credential is identified by
 * telegramApiCredentialId in the path. Updates include changing the bot display
 * name, bot token string, and active flag.
 *
 * Only administrators may perform this update due to the sensitive nature of
 * the data.
 *
 * @param props - Properties for updating the Telegram API credential
 * @param props.administrator - The authenticated administrator performing the
 *   update
 * @param props.telegramApiCredentialId - UUID of the Telegram API credential to
 *   update
 * @param props.body - Update data for the Telegram API credential
 * @returns The updated Telegram API credential record
 * @throws {Error} Throws if the Telegram API credential does not exist
 */
export async function puttelegramFileDownloaderAdministratorTelegramApiCredentialsTelegramApiCredentialId(props: {
  administrator: AdministratorPayload;
  telegramApiCredentialId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderTelegramApiCredential.IUpdate;
}): Promise<ITelegramFileDownloaderTelegramApiCredential> {
  const { administrator, telegramApiCredentialId, body } = props;

  const updated =
    await MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.update(
      {
        where: { id: telegramApiCredentialId },
        data: {
          bot_name: body.bot_name,
          bot_token: body.bot_token,
          is_active: body.is_active,
          updated_at: toISOStringSafe(new Date()),
        },
      },
    );

  return {
    id: updated.id,
    bot_name: updated.bot_name,
    bot_token: updated.bot_token,
    is_active: updated.is_active,
    last_used_at: updated.last_used_at ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
