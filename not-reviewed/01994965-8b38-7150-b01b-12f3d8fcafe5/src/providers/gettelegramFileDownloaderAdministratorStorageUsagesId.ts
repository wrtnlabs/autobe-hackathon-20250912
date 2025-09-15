import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Get detailed storage usage by ID.
 *
 * Accessible only to administrators. Retrieves storage quota, file counts, and
 * user references.
 *
 * @param props - Contains administrator payload and storage usage UUID.
 * @param props.administrator - Authenticated administrator.
 * @param props.id - Storage usage record UUID.
 * @returns Storage usage details conforming to
 *   ITelegramFileDownloaderStorageUsage.
 * @throws Error if the record is not found.
 */
export async function gettelegramFileDownloaderAdministratorStorageUsagesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderStorageUsage> {
  const { id } = props;

  const storageUsage =
    await MyGlobal.prisma.telegram_file_downloader_storage_usages.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: storageUsage.id,
    enduser_id: storageUsage.enduser_id,
    developer_id: storageUsage.developer_id ?? null,
    storage_bytes_used: storageUsage.storage_bytes_used,
    file_count: storageUsage.file_count,
    quota_max_bytes: storageUsage.quota_max_bytes,
    created_at: toISOStringSafe(storageUsage.created_at),
    updated_at: toISOStringSafe(storageUsage.updated_at),
    deleted_at: storageUsage.deleted_at
      ? toISOStringSafe(storageUsage.deleted_at)
      : null,
  };
}
