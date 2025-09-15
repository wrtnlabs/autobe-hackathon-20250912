import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import { IPageITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve a filtered, paginated list of administrators.
 *
 * This operation allows an authenticated administrator to query the list of
 * administrator users with optional filters including email, password hash,
 * creation date, update date, and soft deletion status. Pagination and sorting
 * by creation date descending are supported to manage large data sets
 * efficiently.
 *
 * @param props - Object containing the authenticated administrator and
 *   filtering parameters
 * @param props.administrator - Authenticated administrator payload
 * @param props.body - Search criteria and pagination parameters for
 *   administrators
 * @returns Paginated list of administrator records matching the filters
 * @throws {Error} Throws if database operation fails
 */
export async function patchtelegramFileDownloaderAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderAdministrator.IRequest;
}): Promise<IPageITelegramFileDownloaderAdministrator> {
  const { body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions: {
    email?: { contains: string };
    password_hash?: { contains: string };
    deleted_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } = {};

  if (body.email !== undefined) {
    whereConditions.email = { contains: body.email };
  }
  if (body.password_hash !== undefined) {
    whereConditions.password_hash = { contains: body.password_hash };
  }

  if (body.deleted_at === null) {
    whereConditions.deleted_at = null;
  } else if (body.deleted_at !== undefined) {
    whereConditions.deleted_at = body.deleted_at;
  }

  if (body.created_at === null) {
    whereConditions.created_at = null;
  } else if (body.created_at !== undefined) {
    whereConditions.created_at = body.created_at;
  }

  if (body.updated_at === null) {
    whereConditions.updated_at = null;
  } else if (body.updated_at !== undefined) {
    whereConditions.updated_at = body.updated_at;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_administrators.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_administrators.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      email: item.email,
      password_hash: item.password_hash,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
