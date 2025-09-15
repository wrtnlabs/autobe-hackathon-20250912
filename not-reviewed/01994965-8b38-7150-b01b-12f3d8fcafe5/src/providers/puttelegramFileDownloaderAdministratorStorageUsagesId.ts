import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing storage usage record identified by its unique ID. This
 * operation updates usage statistics such as storage bytes used, file count,
 * and max quota. It validates authorization via administrator payload and
 * ensures the record exists and is not soft deleted.
 *
 * @param props - Object containing administrator authentication, record ID, and
 *   update data
 * @param props.administrator - The authenticated administrator performing the
 *   update
 * @param props.id - UUID of the storage usage record to update
 * @param props.body - Partial update information for the storage usage
 * @returns The updated storage usage record with all fields including
 *   timestamps
 * @throws {Error} Throws if the storage usage record with the specified ID is
 *   not found or soft deleted
 */
export async function puttelegramFileDownloaderAdministratorStorageUsagesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderStorageUsage.IUpdate;
}): Promise<ITelegramFileDownloaderStorageUsage> {
  const { administrator, id, body } = props;

  const storageUsage =
    await MyGlobal.prisma.telegram_file_downloader_storage_usages.findUniqueOrThrow(
      {
        where: {
          id,
          deleted_at: null,
        },
      },
    );

  const updated =
    await MyGlobal.prisma.telegram_file_downloader_storage_usages.update({
      where: { id },
      data: {
        enduser_id: body.enduser_id ?? undefined,
        developer_id:
          body.developer_id === null ? null : (body.developer_id ?? undefined),
        storage_bytes_used: body.storage_bytes_used ?? undefined,
        file_count: body.file_count ?? undefined,
        quota_max_bytes: body.quota_max_bytes ?? undefined,
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    enduser_id: updated.enduser_id,
    developer_id: updated.developer_id ?? null,
    storage_bytes_used: updated.storage_bytes_used,
    file_count: updated.file_count,
    quota_max_bytes: updated.quota_max_bytes,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
