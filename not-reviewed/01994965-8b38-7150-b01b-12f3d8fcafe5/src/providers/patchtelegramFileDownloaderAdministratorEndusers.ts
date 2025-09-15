import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { IPageITelegramFileDownloaderEnduser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderEnduser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve a filtered list of Telegram File Downloader end users.
 *
 * This operation queries the telegram_file_downloader_endusers table and
 * returns summary information about users. It supports filters for deletion
 * status and email search, pagination with page and limit parameters, and
 * returns a paginated summary excluding sensitive information such as password
 * hashes.
 *
 * Authentication and authorization are enforced externally via the
 * administrator authentication parameter. No sensitive data like password
 * hashes are ever returned.
 *
 * @param props - Object containing administrator payload and request body with
 *   filters
 * @param props.administrator - The authenticated administrator performing the
 *   query
 * @param props.body - The filter and pagination criteria for Telegram File
 *   Downloader end users
 * @returns A paginated summary list of end users matching the filters
 * @throws {Error} When the page or limit parameters are out of valid range
 */
export async function patchtelegramFileDownloaderAdministratorEndusers(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderEndUser.IRequest;
}): Promise<IPageITelegramFileDownloaderEnduser.ISummary> {
  const { administrator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  if (page < 1) throw new Error("Invalid parameter: page must be >= 1");
  if (limit < 1) throw new Error("Invalid parameter: limit must be >= 1");

  // Build Prisma where filter
  const where = {
    deleted_at: body.deleted === true ? { not: null } : null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        email: { contains: body.search },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_endusers.findMany({
      where,
      select: {
        id: true,
        email: true,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_endusers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows,
  };
}
