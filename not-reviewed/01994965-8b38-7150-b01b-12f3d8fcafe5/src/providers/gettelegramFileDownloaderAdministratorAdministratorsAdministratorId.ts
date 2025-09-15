import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieves detailed information of a specific administrator user by
 * administrator ID.
 *
 * This operation fetches the administrator record from the
 * telegram_file_downloader_administrators table, excluding soft-deleted records
 * (deleted_at != null). Only authenticated administrators may access this
 * endpoint.
 *
 * @param props - Object containing the authenticated administrator and the
 *   target administratorId.
 * @param props.administrator - The authenticated administrator making the
 *   request.
 * @param props.administratorId - The UUID of the administrator to retrieve.
 * @returns The complete administrator profile matching the given
 *   administratorId.
 * @throws {Error} Throws if the administrator does not exist or is
 *   soft-deleted.
 */
export async function gettelegramFileDownloaderAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderAdministrator> {
  const { administrator, administratorId } = props;

  const administratorRecord =
    await MyGlobal.prisma.telegram_file_downloader_administrators.findUniqueOrThrow(
      {
        where: {
          id: administratorId,
          deleted_at: null,
        },
      },
    );

  return {
    id: administratorRecord.id,
    email: administratorRecord.email,
    password_hash: administratorRecord.password_hash,
    created_at: toISOStringSafe(administratorRecord.created_at),
    updated_at: toISOStringSafe(administratorRecord.updated_at),
    deleted_at: administratorRecord.deleted_at
      ? toISOStringSafe(administratorRecord.deleted_at)
      : null,
  };
}
