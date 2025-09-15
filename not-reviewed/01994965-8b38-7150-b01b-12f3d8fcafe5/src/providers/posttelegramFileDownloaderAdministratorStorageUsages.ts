import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create new storage usage record
 *
 * Creates a new storage usage record with detailed metrics including storage
 * bytes used and quota maximum bytes. Only accessible by administrators.
 *
 * @param props - Object containing the administrator payload and the request
 *   body for storage usage creation.
 * @param props.administrator - The authenticated administrator performing the
 *   operation.
 * @param props.body - The storage usage data to create.
 * @returns The created storage usage record with all fields populated.
 * @throws {Error} Throws if the creation fails due to database errors or
 *   constraints.
 */
export async function posttelegramFileDownloaderAdministratorStorageUsages(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderStorageUsage.ICreate;
}): Promise<ITelegramFileDownloaderStorageUsage> {
  const { administrator, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_storage_usages.create({
      data: {
        id,
        enduser_id: body.enduser_id,
        developer_id: body.developer_id ?? null,
        storage_bytes_used: body.storage_bytes_used,
        file_count: body.file_count,
        quota_max_bytes: body.quota_max_bytes,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });

  return {
    id: created.id,
    enduser_id: created.enduser_id,
    developer_id: created.developer_id ?? null,
    storage_bytes_used: created.storage_bytes_used,
    file_count: created.file_count,
    quota_max_bytes: created.quota_max_bytes,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
