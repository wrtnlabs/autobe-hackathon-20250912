import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing Telegram File Downloader end user
 *
 * This operation updates the user identified by enduserId. It supports email,
 * password hash, and deleted_at updates.
 *
 * Authorization: administrator only
 *
 * @param props - The properties for update operation
 * @param props.administrator - Authenticated administrator payload
 * @param props.enduserId - Unique identifier of the end user
 * @param props.body - Update body with email, password_hash, and deleted_at
 * @returns The updated Telegram File Downloader end user
 * @throws {Error} When the end user is not found (404)
 * @throws {Error} When the email is already in use by another user (409)
 */
export async function puttelegramFileDownloaderAdministratorEndusersEnduserId(props: {
  administrator: AdministratorPayload;
  enduserId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderEndUser.IUpdate;
}): Promise<ITelegramFileDownloaderEndUser> {
  const { administrator, enduserId, body } = props;

  const enduser =
    await MyGlobal.prisma.telegram_file_downloader_endusers.findUnique({
      where: { id: enduserId },
    });
  if (!enduser) throw new Error("End user not found");

  if (body.email !== undefined && body.email !== enduser.email) {
    const duplicate =
      await MyGlobal.prisma.telegram_file_downloader_endusers.findFirst({
        where: { email: body.email },
      });
    if (duplicate) throw new Error("Email already exists");
  }

  const updateData: {
    email?: (string & tags.Format<"email">) | undefined;
    password_hash?: string | undefined;
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  } = {
    email: body.email ?? undefined,
    password_hash: body.password_hash ?? undefined,
    deleted_at:
      body.deleted_at === undefined ? undefined : (body.deleted_at ?? null),
  };

  const updated =
    await MyGlobal.prisma.telegram_file_downloader_endusers.update({
      where: { id: enduserId },
      data: updateData,
    });

  // Convert date fields safely without using 'as'
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
