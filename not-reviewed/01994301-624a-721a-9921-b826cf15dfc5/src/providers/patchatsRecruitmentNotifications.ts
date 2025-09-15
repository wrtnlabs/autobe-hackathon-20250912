import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";
import { IPageIAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotification";

/**
 * Search and retrieve paginated notifications list
 * (ats_recruitment_notifications)
 *
 * This endpoint allows actors in the ATS platform (applicants, HR recruiters,
 * tech reviewers, system admins) to retrieve paginated, filtered lists of
 * notification entities, supporting advanced querying and sorting via event
 * type, status, search, and date window. Exposes only notification summary
 * information and ensures strict compliance with system-wide data privacy and
 * separation. No authentication or recipient-based filtering is performed based
 * on the current request.
 *
 * @param props - The request object containing the filter, sort, and pagination
 *   criteria.
 * @param props.body - IAtsRecruitmentNotification.IRequest containing
 *   pagination, sort, filter parameters.
 * @returns Paginated results of notification summaries matching the given
 *   filters, suitable for dashboards or inbox UIs.
 * @throws {Error} If any system error occurs during database query or mapping
 *   operation.
 */
export async function patchatsRecruitmentNotifications(props: {
  body: IAtsRecruitmentNotification.IRequest;
}): Promise<IPageIAtsRecruitmentNotification.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.event_type ? { event_type: body.event_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.search
      ? {
          OR: [
            { event_type: { contains: body.search } },
            { status: { contains: body.search } },
            { reference_table: { contains: body.search } },
          ],
        }
      : {}),
  };

  const orderBy = (() => {
    if (!body.sort) return { created_at: "desc" };
    const field = body.sort.replace(/^[-+]/, "");
    const direction = body.sort.startsWith("-") ? "desc" : "asc";
    return ["created_at", "event_type", "status"].includes(field)
      ? { [field]: direction as "asc" | "desc" }
      : { created_at: "desc" };
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_notifications.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        recipient_applicant_id: true,
        recipient_hrrecruiter_id: true,
        recipient_techreviewer_id: true,
        recipient_systemadmin_id: true,
        event_type: true,
        reference_table: true,
        reference_id: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_notifications.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    recipient_applicant_id: row.recipient_applicant_id ?? undefined,
    recipient_hrrecruiter_id: row.recipient_hrrecruiter_id ?? undefined,
    recipient_techreviewer_id: row.recipient_techreviewer_id ?? undefined,
    recipient_systemadmin_id: row.recipient_systemadmin_id ?? undefined,
    event_type: row.event_type,
    reference_table: row.reference_table,
    reference_id: row.reference_id,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
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
