import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";
import { IPageITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderStorageUsage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a paginated and filtered list of telegram file downloader storage
 * usage records.
 *
 * Allows administrators to search and review storage usage stats such as
 * storage bytes used, file count, and quota max bytes.
 *
 * Supports filtering by enduser or developer IDs, storage usage ranges, file
 * counts, quotas, and creation/update date ranges.
 *
 * Pagination with page number, limit, ordering field, and direction are
 * supported.
 *
 * @param props - Object containing administrator info and the request
 *   filter/pagination body
 * @param props.administrator - Authenticated administrator payload
 * @param props.body - Filter and pagination criteria matching
 *   ITelegramFileDownloaderStorageUsage.IRequest
 * @returns Paginated summary of storage usage records matching filters
 * @throws {Error} Throws if database query fails or validation is incorrect
 */
export async function patchtelegramFileDownloaderAdministratorStorageUsages(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderStorageUsage.IRequest;
}): Promise<IPageITelegramFileDownloaderStorageUsage.ISummary> {
  const { administrator, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (body.enduser_id !== undefined && body.enduser_id !== null) {
    where.enduser_id = body.enduser_id;
  }
  if (body.developer_id !== undefined && body.developer_id !== null) {
    where.developer_id = body.developer_id;
  }

  if (
    body.storage_bytes_used_min !== undefined &&
    body.storage_bytes_used_min !== null
  ) {
    where.storage_bytes_used = where.storage_bytes_used ?? {};
    where.storage_bytes_used.gte = body.storage_bytes_used_min;
  }
  if (
    body.storage_bytes_used_max !== undefined &&
    body.storage_bytes_used_max !== null
  ) {
    where.storage_bytes_used = where.storage_bytes_used ?? {};
    where.storage_bytes_used.lte = body.storage_bytes_used_max;
  }

  if (body.file_count_min !== undefined && body.file_count_min !== null) {
    where.file_count = where.file_count ?? {};
    where.file_count.gte = body.file_count_min;
  }
  if (body.file_count_max !== undefined && body.file_count_max !== null) {
    where.file_count = where.file_count ?? {};
    where.file_count.lte = body.file_count_max;
  }

  if (
    body.quota_max_bytes_min !== undefined &&
    body.quota_max_bytes_min !== null
  ) {
    where.quota_max_bytes = where.quota_max_bytes ?? {};
    where.quota_max_bytes.gte = body.quota_max_bytes_min;
  }
  if (
    body.quota_max_bytes_max !== undefined &&
    body.quota_max_bytes_max !== null
  ) {
    where.quota_max_bytes = where.quota_max_bytes ?? {};
    where.quota_max_bytes.lte = body.quota_max_bytes_max;
  }

  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    where.created_at = where.created_at ?? {};
    where.created_at.gte = body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    where.created_at = where.created_at ?? {};
    where.created_at.lte = body.created_at_to;
  }

  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    where.updated_at = where.updated_at ?? {};
    where.updated_at.gte = body.updated_at_from;
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    where.updated_at = where.updated_at ?? {};
    where.updated_at.lte = body.updated_at_to;
  }

  if (body.deleted_at_null === true) {
    where.deleted_at = {
      not: null,
    };
  } else if (body.deleted_at_null === false) {
    where.deleted_at = null;
  }

  const allowedOrderBy = new Set([
    "id",
    "storage_bytes_used",
    "file_count",
    "quota_max_bytes",
    "created_at",
    "updated_at",
  ]);

  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.orderBy && allowedOrderBy.has(body.orderBy)) {
    const direction = body.orderDirection === "asc" ? "asc" : "desc";
    orderBy = { [body.orderBy]: direction };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_storage_usages.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_storage_usages.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id,
      storage_bytes_used: record.storage_bytes_used,
      file_count: record.file_count,
      quota_max_bytes: record.quota_max_bytes,
    })),
  };
}
