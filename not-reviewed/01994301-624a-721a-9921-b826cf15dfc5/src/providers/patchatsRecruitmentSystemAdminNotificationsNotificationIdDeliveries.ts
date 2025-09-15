import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import { IPageIAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationDelivery";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve paginated delivery attempts for a notification
 * (ats_recruitment_notification_deliveries).
 *
 * This endpoint allows system administrators to query the audit record of all
 * delivery attempts for a given notification event. It provides compliance,
 * troubleshooting, and reporting insight into all system notification delivery
 * attempts, with flexible filtering and sorting. Only soft- delete-respecting
 * active records are included. Filtering is possible on channel, recipient,
 * delivery status, delivery/failure time windows. Sorting and pagination are
 * supported.
 *
 * @param props - Parameters for the operation
 * @param props.systemAdmin - The authenticated system administrator
 *   (authorization required)
 * @param props.notificationId - UUID of the notification whose deliveries are
 *   queried
 * @param props.body - Filtering, pagination, and sorting criteria (see DTO)
 * @returns Paginated page of delivery records for the target notification
 * @throws {Error} If notification does not exist or unauthorized access is
 *   attempted
 */
export async function patchatsRecruitmentSystemAdminNotificationsNotificationIdDeliveries(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentNotificationDelivery.IRequest;
}): Promise<IPageIAtsRecruitmentNotificationDelivery> {
  const { notificationId, body } = props;

  // Authorization: role is enforced by SystemadminPayload and provider, no further check needed.

  // Check notification exists & is not deleted
  const notification =
    await MyGlobal.prisma.ats_recruitment_notifications.findUnique({
      where: { id: notificationId, deleted_at: null },
      select: { id: true },
    });
  if (!notification) throw new Error("Notification not found");

  // Pagination parsing
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Sorting parsing (field whitelist)
  const allowedSortFields = [
    "delivered_at",
    "delivery_status",
    "created_at",
    "recipient_address",
    "delivery_channel",
  ];
  let sortField = "delivered_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    sortOrder = body.sort.startsWith("-") ? "desc" : "asc";
    const candidate = body.sort.replace(/^[-+]/, "");
    if (allowedSortFields.includes(candidate)) sortField = candidate;
  }

  // Build where filter with only schema-verified optional filters
  const where = {
    notification_id: notificationId,
    deleted_at: null,
    ...(body.delivery_channel !== undefined &&
      body.delivery_channel !== null && {
        delivery_channel: body.delivery_channel,
      }),
    ...(body.recipient_address !== undefined &&
      body.recipient_address !== null && {
        recipient_address: body.recipient_address,
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
    ...((body.delivered_at_from !== undefined &&
      body.delivered_at_from !== null) ||
    (body.delivered_at_to !== undefined && body.delivered_at_to !== null)
      ? {
          delivered_at: {
            ...(body.delivered_at_from !== undefined &&
              body.delivered_at_from !== null && {
                gte: body.delivered_at_from,
              }),
            ...(body.delivered_at_to !== undefined &&
              body.delivered_at_to !== null && { lte: body.delivered_at_to }),
          },
        }
      : {}),
    ...((body.failed_at_from !== undefined && body.failed_at_from !== null) ||
    (body.failed_at_to !== undefined && body.failed_at_to !== null)
      ? {
          failed_at: {
            ...(body.failed_at_from !== undefined &&
              body.failed_at_from !== null && { gte: body.failed_at_from }),
            ...(body.failed_at_to !== undefined &&
              body.failed_at_to !== null && { lte: body.failed_at_to }),
          },
        }
      : {}),
  };

  // Query delivery records and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_notification_deliveries.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_notification_deliveries.count({ where }),
  ]);

  // Map DB/prisma rows to API DTO (date-string conversion and optionals)
  const data: IAtsRecruitmentNotificationDelivery[] = records.map((row) => ({
    id: row.id,
    notification_id: row.notification_id,
    delivery_channel: row.delivery_channel,
    recipient_address: row.recipient_address,
    delivery_status: row.delivery_status,
    delivery_result_detail: row.delivery_result_detail ?? null,
    delivery_attempt: row.delivery_attempt,
    delivered_at: row.delivered_at ? toISOStringSafe(row.delivered_at) : null,
    failed_at: row.failed_at ? toISOStringSafe(row.failed_at) : null,
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
