import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTelegramApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredential";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new Telegram API credential to authenticate with Telegram services.
 *
 * This operation writes a new record into
 * telegram_file_downloader_telegram_api_credentials, including bot name, bot
 * token, and active status. Creation and update timestamps are set at creation
 * time. Only authorized administrators may perform this action.
 *
 * @param props - Object containing administrator payload and creation data
 * @param props.administrator - The authenticated administrator performing this
 *   action
 * @param props.body - The data for creating the Telegram API credential
 * @returns The created Telegram API credential record
 * @throws {Error} If the creation fails due to database constraints or other
 *   errors
 */
export async function posttelegramFileDownloaderAdministratorTelegramApiCredentials(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderTelegramApiCredential.ICreate;
}): Promise<ITelegramFileDownloaderTelegramApiCredential> {
  const { administrator, body } = props;

  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.create(
      {
        data: {
          id: newId,
          bot_name: body.bot_name,
          bot_token: body.bot_token,
          is_active: body.is_active,
          created_at: now,
          updated_at: now,
        },
      },
    );

  return {
    id: created.id,
    bot_name: created.bot_name,
    bot_token: created.bot_token,
    is_active: created.is_active,
    last_used_at: null,
    created_at: now,
    updated_at: now,
  };
}
