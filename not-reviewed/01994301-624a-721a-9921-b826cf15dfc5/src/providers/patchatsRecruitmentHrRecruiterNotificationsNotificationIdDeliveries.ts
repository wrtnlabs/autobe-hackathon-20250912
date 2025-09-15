import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import { IPageIAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationDelivery";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve paginated delivery attempts for a notification
 * (ats_recruitment_notification_deliveries).
 *
 * This API returns a paginated, filterable list of all delivery attempts
 * (across email, SMS, app_push, etc.) for a given notification. Each result
 * record represents a unique delivery event, including recipient, channel,
 * status, and full audit context. HR recruiters may only view notifications and
 * related deliveries for which they are authorized recipients. Compliance and
 * incident investigation uses are supported. Filters include channel, address,
 * status, and delivered/failed time windows; results support pagination and
 * field-based sorting.
 *
 * Authorization: Only the HR recruiter assigned as recipient to the
 * notification may view associated delivery attempts.
 *
 * @param props - Provider props including recruiter payload, notificationId,
 *   and optional filter/body params
 * @param props.hrRecruiter - The authenticated HR recruiter (authorization
 *   context)
 * @param props.notificationId - UUID of the notification whose deliveries to
 *   return
 * @param props.body - Search and pagination parameters for filtering deliveries
 * @returns Paginated result set of delivery attempts (with full metadata)
 * @throws {Error} If notification does not exist or is not owned by recruiter
 */
export async function patchatsRecruitmentHrRecruiterNotificationsNotificationIdDeliveries(props: {
  hrRecruiter: HrrecruiterPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentNotificationDelivery.IRequest;
}): Promise<IPageIAtsRecruitmentNotificationDelivery> {
  // 1. Ensure notification exists and is visible to authenticated recruiter
  const notification =
    await MyGlobal.prisma.ats_recruitment_notifications.findFirst({
      where: {
        id: props.notificationId,
        recipient_hrrecruiter_id: props.hrRecruiter.id,
      },
    });
  if (!notification) {
    throw new Error("Notification not found or access denied");
  }

  // 2. Build filter conditions for deliveries table
  const where = {
    notification_id: props.notificationId,
    ...(props.body.delivery_channel !== undefined && {
      delivery_channel: props.body.delivery_channel,
    }),
    ...(props.body.recipient_address !== undefined && {
      recipient_address: props.body.recipient_address,
    }),
    ...(props.body.delivery_status !== undefined && {
      delivery_status: props.body.delivery_status,
    }),
    ...(props.body.delivered_at_from !== undefined ||
    props.body.delivered_at_to !== undefined
      ? {
          delivered_at: {
            ...(props.body.delivered_at_from !== undefined && {
              gte: props.body.delivered_at_from,
            }),
            ...(props.body.delivered_at_to !== undefined && {
              lte: props.body.delivered_at_to,
            }),
          },
        }
      : {}),
    ...(props.body.failed_at_from !== undefined ||
    props.body.failed_at_to !== undefined
      ? {
          failed_at: {
            ...(props.body.failed_at_from !== undefined && {
              gte: props.body.failed_at_from,
            }),
            ...(props.body.failed_at_to !== undefined && {
              lte: props.body.failed_at_to,
            }),
          },
        }
      : {}),
  };

  // 3. Pagination
  const currentPage = props.body.page ?? 1;
  const pageLimit = props.body.limit ?? 20;
  const skip = (currentPage - 1) * pageLimit;

  // 4. Sorting (allow only allowed fields)
  let orderBy = { delivered_at: "desc" as const };
  if (props.body.sort) {
    let sortField = props.body.sort;
    let sortOrder: "asc" | "desc" = "asc";
    if (sortField.startsWith("-")) {
      sortOrder = "desc";
      sortField = sortField.slice(1);
    }
    const allowedFields = [
      "delivered_at",
      "failed_at",
      "delivery_status",
      "delivery_channel",
      "created_at",
    ];
    if (allowedFields.includes(sortField)) {
      orderBy = { [sortField]: sortOrder };
    }
  }

  // 5. Query paginated results and total count
  const [deliveries, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_notification_deliveries.findMany({
      where,
      orderBy,
      skip,
      take: pageLimit,
    }),
    MyGlobal.prisma.ats_recruitment_notification_deliveries.count({ where }),
  ]);

  // 6. Map to API output (all date fields are already string/nullable; just set undefined for optional)
  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(pageLimit),
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: deliveries.map((d) => ({
      id: d.id,
      notification_id: d.notification_id,
      delivery_channel: d.delivery_channel,
      recipient_address: d.recipient_address,
      delivery_status: d.delivery_status,
      delivery_result_detail: d.delivery_result_detail ?? undefined,
      delivery_attempt: d.delivery_attempt,
      delivered_at: d.delivered_at ?? undefined,
      failed_at: d.failed_at ?? undefined,
      created_at: d.created_at,
      updated_at: d.updated_at,
      deleted_at: d.deleted_at ?? undefined,
    })),
  };
}
