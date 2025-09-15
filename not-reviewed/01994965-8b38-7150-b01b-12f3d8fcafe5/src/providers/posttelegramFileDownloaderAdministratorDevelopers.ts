import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new developer user who can access the Telegram File Downloader API.
 *
 * This operation requires administrative privileges and registers a developer
 * user with the provided email and password hash.
 *
 * @param props - Object containing the administrator payload and creation data
 * @param props.administrator - The authenticated administrator making this
 *   request
 * @param props.body - The developer creation data including email and password
 *   hash
 * @returns The newly created developer user entity
 * @throws {Error} Throws if creation fails due to database or validation errors
 */
export async function posttelegramFileDownloaderAdministratorDevelopers(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderDeveloper.ICreate;
}): Promise<ITelegramFileDownloaderDeveloper> {
  const { administrator, body } = props;

  // Authorization may be performed here if needed

  const id = v4() as string & tags.Format<"uuid">;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_developers.create({
      data: {
        id,
        email: body.email,
        password_hash: body.password_hash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
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
