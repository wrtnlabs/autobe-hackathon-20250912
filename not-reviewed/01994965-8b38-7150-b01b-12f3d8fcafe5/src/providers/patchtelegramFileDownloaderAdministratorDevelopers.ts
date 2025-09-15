import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import { IPageITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderDeveloper";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve list of developer users.
 *
 * This operation allows administrators to retrieve a paginated, filtered, and
 * sorted list of developer users. It supports search by email, filters on
 * deleted status, pagination, and sorting by created_at or email.
 *
 * @param props - Object containing the administrator payload and search
 *   parameters
 * @param props.administrator - Authenticated administrator making the request
 * @param props.body - Search criteria and pagination information
 * @returns Paginated list of developer user summaries with pagination details
 * @throws {Error} When database operations fail
 */
export async function patchtelegramFileDownloaderAdministratorDevelopers(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderDeveloper.IRequest;
}): Promise<IPageITelegramFileDownloaderDeveloper.ISummary> {
  const { body } = props;

  // Default pagination values, ensure minimum limits
  const page = (body.page ?? 1) < 1 ? 1 : (body.page ?? 1);
  const limit = (body.limit ?? 10) < 1 ? 10 : (body.limit ?? 10);
  const skip = (page - 1) * limit;

  // Construct where clause based on search and deleted filters
  const where = {
    ...(body.search !== undefined &&
      body.search !== null && {
        email: { contains: body.search },
      }),
    ...(body.deleted !== undefined && body.deleted !== null
      ? body.deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : { deleted_at: null }),
  };

  // Determine order by based on body.order, default to created_at desc
  const validOrderFields = ["created_at", "email"];
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };

  if (body.order !== undefined && body.order !== null) {
    const orderLower = body.order.toLowerCase();
    const desc = orderLower.endsWith("desc");
    const asc = orderLower.endsWith("asc");

    const field = orderLower.replace(/\s*(asc|desc)$/, "");

    if (validOrderFields.includes(field) && (desc || asc)) {
      orderBy = { [field]: desc ? "desc" : "asc" };
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_developers.findMany({
      where,
      select: {
        id: true,
        email: true,
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.telegram_file_downloader_developers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
    })),
  };
}
