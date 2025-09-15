import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { IPageIAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationTemplate";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Paginated search for notification templates
 * (ats_recruitment_notification_templates).
 *
 * This endpoint retrieves a paginated list of notification templates from the
 * ATS system, allowing system administrators to filter, search, and sort
 * reusable message templates for notifications (email/SMS/app/webhook).
 * Supports advanced filtering by template code, channel, activation status, and
 * full-text fields. Pagination and sorting by multiple columns is supported.
 * Only active (non-deleted) templates are shown.
 *
 * @param props - Request object containing authentication and search parameters
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - The filter/search/sort/pagination information
 * @returns Paginated summary listing of notification templates
 * @throws {Error} If Prisma query fails
 */
export async function patchatsRecruitmentSystemAdminNotificationTemplates(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentNotificationTemplate.IRequest;
}): Promise<IPageIAtsRecruitmentNotificationTemplate.ISummary> {
  const { body } = props;

  // Enforce default pagination and clamp invalid values
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;

  // Build type-safe filtering logic
  const where: Record<string, unknown> = {
    deleted_at: null, // only non-deleted
    ...(body.template_code !== undefined &&
    body.template_code !== null &&
    body.template_code.length > 0
      ? { template_code: { contains: body.template_code } }
      : {}),
    ...(body.channel !== undefined &&
    body.channel !== null &&
    body.channel.length > 0
      ? { channel: { equals: body.channel } }
      : {}),
    ...(body.title !== undefined && body.title !== null && body.title.length > 0
      ? { title: { contains: body.title } }
      : {}),
    ...(body.is_active !== undefined && body.is_active !== null
      ? { is_active: body.is_active }
      : {}),
    ...(body.body !== undefined && body.body !== null && body.body.length > 0
      ? { body: { contains: body.body } }
      : {}),
  };

  // Support sorting by allowed columns; default is created_at DESC
  const allowedSort: string[] = [
    "template_code",
    "channel",
    "title",
    "is_active",
    "created_at",
    "updated_at",
  ];
  const sortBy = allowedSort.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Query database for paginated records and count
  const [rows, records] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_notification_templates.findMany({
      where,
      orderBy: { [sortBy as string]: sortDirection },
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.ats_recruitment_notification_templates.count({ where }),
  ]);

  // Map database rows to DTO - format all datetimes as ISO strings
  const data = rows.map((row) => ({
    id: row.id,
    template_code: row.template_code,
    channel: row.channel,
    title: row.title,
    subject: row.subject ?? undefined,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Paginated result
  const pages = records === 0 ? 1 : Math.ceil(records / safeLimit);

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: Number(records),
      pages: Number(pages),
    },
    data,
  };
}
