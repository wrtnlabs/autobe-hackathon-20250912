import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTelegramApiCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredentials";
import { IPageITelegramFileDownloaderTelegramApiCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderTelegramApiCredentials";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search Telegram API credentials
 *
 * Allows administrators to search and retrieve Telegram API credential records
 * with filtering, pagination, and sorting. Supports filtering by bot name,
 * active status, and recent usage. Returns paginated list excluding sensitive
 * bot tokens.
 *
 * @param props - Object containing administrator payload and request filters
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.body - Request filters including bot_name, is_active,
 *   last_used_at, pagination and search
 * @returns A paginated list of Telegram API credentials matching the filters
 * @throws {Error} If database query fails or other unexpected errors occur
 */
export async function patchtelegramFileDownloaderAdministratorTelegramApiCredentials(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderTelegramApiCredentials.IRequest;
}): Promise<IPageITelegramFileDownloaderTelegramApiCredentials> {
  const { administrator, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build query conditions
  const where: Record<string, unknown> = {};

  if (body.bot_name !== undefined && body.bot_name !== null) {
    where.bot_name = { contains: body.bot_name };
  }

  if (body.is_active !== undefined && body.is_active !== null) {
    where.is_active = body.is_active;
  }

  if (body.last_used_at !== undefined && body.last_used_at !== null) {
    where.last_used_at = { gte: body.last_used_at };
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [{ bot_name: { contains: body.search } }];
  }

  // Perform DB queries
  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_telegram_api_credentials.count({
      where,
    }),
  ]);

  // Format the response, exclude bot_token for security
  const data = results.map((item) => ({
    id: item.id,
    bot_name: item.bot_name,
    is_active: item.is_active,
    last_used_at: item.last_used_at ? toISOStringSafe(item.last_used_at) : null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
