import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrators } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrators";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new administrator user account.
 *
 * This operation allows the creation of a new administrator record in the
 * Telegram File Downloader system, storing essential details such as email and
 * password hash to enable authentication and access to administrative features.
 * It corresponds to the telegram_file_downloader_administrators table in the
 * Prisma schema, ensuring that each administrator has a unique email for
 * identification and maintaining timestamps for record creation and updates.
 *
 * Security considerations include enforcing email uniqueness and storing hashed
 * passwords.
 *
 * @param props - Object containing the authenticated administrator and creation
 *   data
 * @param props.administrator - The authenticated administrator performing the
 *   operation
 * @param props.body - Administrator creation data, including email and password
 *   hash
 * @returns The newly created administrator entity
 * @throws {Error} When an administrator with the given email already exists
 */
export async function posttelegramFileDownloaderAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderAdministrators.ICreate;
}): Promise<ITelegramFileDownloaderAdministrators> {
  const { administrator, body } = props;

  const existing =
    await MyGlobal.prisma.telegram_file_downloader_administrators.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  if (existing !== null) {
    throw new Error("Administrator with this email already exists");
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.telegram_file_downloader_administrators.create({
      data: {
        id,
        email: body.email,
        password_hash: body.password_hash,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
