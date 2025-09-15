import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTelegramApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredential";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve Telegram API credential by ID for administrators.
 *
 * This operation fetches the Telegram API credential entity identified by the
 * unique telegramApiCredentialId. It returns the bot name, token, active flag,
 * and timestamps with proper ISO 8601 formatting.
 *
 * Access is restricted to authenticated administrators.
 *
 * @param props - Object containing administrator payload and
 *   telegramApiCredentialId
 * @param props.administrator - Authenticated administrator payload
 * @param props.telegramApiCredentialId - UUID of the Telegram API credential
 * @returns The matching Telegram API credential record
 * @throws {Error} When the credential is not found
 */
export async function gettelegramFileDownloaderAdministratorTelegramApiCredentialsTelegramApiCredentialId(props: {
  administrator: AdministratorPayload;
  telegramApiCredentialId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderTelegramApiCredential> {
  const { telegramApiCredentialId } = props;

  const credential =
    await MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.findUniqueOrThrow(
      {
        where: { id: telegramApiCredentialId },
      },
    );

  return {
    id: credential.id,
    bot_name: credential.bot_name,
    bot_token: credential.bot_token,
    is_active: credential.is_active,
    last_used_at: credential.last_used_at
      ? toISOStringSafe(credential.last_used_at)
      : null,
    created_at: toISOStringSafe(credential.created_at),
    updated_at: toISOStringSafe(credential.updated_at),
  };
}
