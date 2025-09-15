import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Delete storage usage record permanently by its unique UUID.
 *
 * This operation performs a hard delete on the
 * telegram_file_downloader_storage_usages table, removing quota tracking data
 * associated with endusers or developers. It requires administrator
 * authorization to prevent unauthorized quota manipulation.
 *
 * @param props - Object containing the administrator identity and storage usage
 *   record ID to delete
 * @param props.administrator - Authenticated administrator performing the
 *   deletion
 * @param props.id - UUID of the storage usage record to delete
 * @returns Promise<void> indicating completion
 * @throws {Error} Throws if the storage usage record does not exist or on
 *   database errors
 */
export async function deletetelegramFileDownloaderAdministratorStorageUsagesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, id } = props;

  // Verify storage usage record exists
  await MyGlobal.prisma.telegram_file_downloader_storage_usages.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Perform hard delete
  await MyGlobal.prisma.telegram_file_downloader_storage_usages.delete({
    where: { id },
  });
}
