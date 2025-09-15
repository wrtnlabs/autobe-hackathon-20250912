import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderErrorLog";
import { IPageITelegramFileDownloaderErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderErrorLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve paginated filtered error logs
 *
 * This PATCH operation provides administrators with the ability to query error
 * logs with various filters such as error code, resolution status, and search
 * term. Pagination and sorting are supported to efficiently navigate large log
 * sets.
 *
 * @param props - Object containing the authenticated administrator payload and
 *   the request body with filtering and pagination criteria.
 * @param props.administrator - Authenticated administrator metadata.
 * @param props.body - Filtering and pagination parameters matching
 *   ITelegramFileDownloaderErrorLog.IRequest.
 * @returns A paginated list of error logs conforming to
 *   IPageITelegramFileDownloaderErrorLog.
 * @throws {Error} When the query parameters or database access encounters an
 *   issue.
 */
export async function patchtelegramFileDownloaderAdministratorErrorLogs(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderErrorLog.IRequest;
}): Promise<IPageITelegramFileDownloaderErrorLog> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const where: {
    error_code?: string;
    resolved?: boolean;
    OR?: {
      error_code?: {
        contains: string;
      };
      error_message?: {
        contains: string;
      };
      source_component?: {
        contains: string;
      };
    }[];
  } = {};

  if (body.filter_error_code !== undefined && body.filter_error_code !== null) {
    where.error_code = body.filter_error_code;
  }

  if (body.filter_resolved !== undefined && body.filter_resolved !== null) {
    where.resolved = body.filter_resolved;
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    const search = body.search.trim();
    where.OR = [
      {
        error_code: {
          contains: search,
        },
      },
      {
        error_message: {
          contains: search,
        },
      },
      {
        source_component: {
          contains: search,
        },
      },
    ];
  }

  const allowedSortFields = ["occurred_at", "error_code", "resolved"] as const;
  let orderBy: { [key: string]: "asc" | "desc" } = { occurred_at: "desc" };

  if (body.order !== undefined && body.order !== null) {
    const parts = body.order.trim().split(/\s+/);
    const field = parts[0];
    const direction = (parts[1] ?? "desc").toLowerCase();

    if (allowedSortFields.includes(field as any)) {
      if (direction === "asc" || direction === "desc") {
        orderBy = { [field]: direction };
      }
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_error_logs.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_error_logs.count({
      where,
    }),
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
      error_code: record.error_code,
      error_message: record.error_message,
      source_component: record.source_component,
      occurred_at: toISOStringSafe(record.occurred_at),
      resolved: record.resolved,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
