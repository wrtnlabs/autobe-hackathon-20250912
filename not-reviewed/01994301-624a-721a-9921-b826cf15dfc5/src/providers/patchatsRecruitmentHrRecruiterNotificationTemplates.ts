import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { IPageIAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationTemplate";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Paginated search for notification templates
 * (ats_recruitment_notification_templates).
 *
 * This endpoint retrieves a paginated list of notification templates from the
 * ATS schema, filtered and sorted by the provided criteria. HR recruiters can
 * search by template code, channel, title, body, activation status, and sort
 * results. Results include template summary information and pagination
 * metadata, supporting efficient navigation for notification template
 * management screens.
 *
 * @param props - Request props
 * @param props.hrRecruiter - Authenticated HR recruiter payload
 * @param props.body - Filter, sorting, and pagination options
 * @returns Paginated summary list of notification templates
 * @throws {Error} Page or limit is non-positive or invalid
 */
export async function patchatsRecruitmentHrRecruiterNotificationTemplates(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentNotificationTemplate.IRequest;
}): Promise<IPageIAtsRecruitmentNotificationTemplate.ISummary> {
  const { body } = props;

  // Defensive: ensure positive page and limit (no native Date usage, no as assertions)
  const page = body.page !== undefined && body.page > 0 ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined && body.limit > 0 ? Number(body.limit) : 10;
  if (page < 1 || limit < 1) {
    throw new Error("Page and limit must be positive integers.");
  }

  // Only allow sort_by fields present in actual table
  const allowedSortColumns = [
    "template_code",
    "channel",
    "title",
    "created_at",
    "updated_at",
  ];
  const sortBy =
    body.sort_by && allowedSortColumns.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Build SQL-like where clause (deleted_at must be null)
  const where = {
    deleted_at: null,
    ...(body.template_code !== undefined &&
      body.template_code !== null &&
      body.template_code.length > 0 && {
        template_code: { contains: body.template_code },
      }),
    ...(body.channel !== undefined &&
      body.channel !== null &&
      body.channel.length > 0 && {
        channel: body.channel,
      }),
    ...(body.title !== undefined &&
      body.title !== null &&
      body.title.length > 0 && {
        title: { contains: body.title },
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    ...(body.body !== undefined &&
      body.body !== null &&
      body.body.length > 0 && {
        body: { contains: body.body },
      }),
  };

  // Query in parallel for data & total count
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_notification_templates.count({ where }),
    MyGlobal.prisma.ats_recruitment_notification_templates.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        template_code: true,
        channel: true,
        title: true,
        subject: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data: rows.map((row) => ({
      id: row.id,
      template_code: row.template_code,
      channel: row.channel,
      title: row.title,
      subject:
        row.subject !== null && row.subject !== undefined
          ? row.subject
          : undefined,
      is_active: row.is_active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
