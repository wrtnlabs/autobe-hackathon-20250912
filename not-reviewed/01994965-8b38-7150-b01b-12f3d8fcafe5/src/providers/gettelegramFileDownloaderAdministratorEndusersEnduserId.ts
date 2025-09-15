import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve detailed profile information of a specific Telegram File Downloader
 * end user by enduserId.
 *
 * Access to this operation is restricted to administrators for security and
 * privacy.
 *
 * Returns full detailed information excluding sensitive authentication data
 * like password_hash.
 *
 * @param props - Object containing administrator auth payload and enduserId
 *   parameter.
 * @param props.administrator - Authenticated administrator payload.
 * @param props.enduserId - Unique identifier of the Telegram File Downloader
 *   end user.
 * @returns Detailed Telegram File Downloader end user data excluding sensitive
 *   info.
 * @throws {Error} Throws if no end user is found with the provided enduserId
 *   (404 error).
 */
export async function gettelegramFileDownloaderAdministratorEndusersEnduserId(props: {
  administrator: AdministratorPayload;
  enduserId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderEndUser> {
  const { administrator, enduserId } = props;

  const result =
    await MyGlobal.prisma.telegram_file_downloader_endusers.findUnique({
      where: { id: enduserId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!result) {
    throw new Error(`End user with id ${enduserId} not found`);
  }

  return {
    id: result.id,
    email: result.email,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
