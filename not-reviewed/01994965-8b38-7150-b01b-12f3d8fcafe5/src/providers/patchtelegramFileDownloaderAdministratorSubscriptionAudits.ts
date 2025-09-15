import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderSubscriptionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionAudit";
import { IPageITelegramFileDownloaderSubscriptionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionAudit";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve subscription audit records with filtering, sorting, and
 * pagination.
 *
 * This endpoint is accessible only to administrators.
 *
 * @param props - Object containing authenticated administrator and request body
 *   with filters
 * @param props.administrator - Authenticated administrator user making the
 *   request
 * @param props.body - Request body containing filters, pagination, and sorting
 *   options
 * @returns Paginated list of subscription audit records matching the criteria
 * @throws {Error} If any unexpected error occurs during database access
 */
export async function patchtelegramFileDownloaderAdministratorSubscriptionAudits(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderSubscriptionAudit.IRequest;
}): Promise<IPageITelegramFileDownloaderSubscriptionAudit> {
  const { administrator, body } = props;

  const where: {
    user_id?: string & tags.Format<"uuid">;
    change_type?: string;
    telegram_file_downloader_subscription_plan_id?: string &
      tags.Format<"uuid">;
    notes?: { contains: string };
    created_at?: string & tags.Format<"date-time">;
    updated_at?: string & tags.Format<"date-time">;
    deleted_at?: (string & tags.Format<"date-time">) | null;
  } = {};

  if (body.filter) {
    if (body.filter.user_id !== undefined && body.filter.user_id !== null) {
      where.user_id = body.filter.user_id;
    }
    if (
      body.filter.change_type !== undefined &&
      body.filter.change_type !== null
    ) {
      where.change_type = body.filter.change_type;
    }
    if (
      body.filter.subscription_plan_id !== undefined &&
      body.filter.subscription_plan_id !== null
    ) {
      where.telegram_file_downloader_subscription_plan_id =
        body.filter.subscription_plan_id;
    }
    if (body.filter.notes !== undefined && body.filter.notes !== null) {
      where.notes = { contains: body.filter.notes };
    }
    if (
      body.filter.created_at !== undefined &&
      body.filter.created_at !== null
    ) {
      where.created_at = body.filter.created_at;
    }
    if (
      body.filter.updated_at !== undefined &&
      body.filter.updated_at !== null
    ) {
      where.updated_at = body.filter.updated_at;
    }
    if (
      body.filter.deleted_at !== undefined &&
      body.filter.deleted_at !== null
    ) {
      where.deleted_at = body.filter.deleted_at;
    }
  }

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const validOrderFields = [
    "change_timestamp",
    "created_at",
    "updated_at",
    "deleted_at",
  ];

  const orderByField = validOrderFields.includes(body.sort?.orderBy ?? "")
    ? (body.sort?.orderBy as (typeof validOrderFields)[number])
    : "change_timestamp";

  const orderDirection = body.sort?.direction === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_subscription_audits.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
    }),
    MyGlobal.prisma.telegram_file_downloader_subscription_audits.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    telegram_file_downloader_subscription_plan_id:
      row.telegram_file_downloader_subscription_plan_id as string &
        tags.Format<"uuid">,
    telegram_file_downloader_payment_id:
      row.telegram_file_downloader_payment_id ?? undefined,
    user_id: row.user_id as string & tags.Format<"uuid">,
    change_type: row.change_type,
    change_timestamp: toISOStringSafe(row.change_timestamp),
    notes: row.notes ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
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
