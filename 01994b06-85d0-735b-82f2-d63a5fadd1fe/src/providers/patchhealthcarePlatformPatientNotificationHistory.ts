import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import { IPageIHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotificationHistory";
import { PatientPayload } from "../decorators/payload/PatientPayload";

export async function patchhealthcarePlatformPatientNotificationHistory(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformNotificationHistory.IRequest;
}): Promise<IPageIHealthcarePlatformNotificationHistory> {
  const { patient, body } = props;

  // Enforce strict self-access only
  if (body.recipientId !== undefined && body.recipientId !== patient.id) {
    throw new Error(
      "Forbidden: You can only access your own notification history.",
    );
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 50;

  // Only allow sorting by whitelisted fields (type narrowing)
  const allowedSortFields = [
    "created_at",
    "event_time",
    "event_type",
    "delivery_channel",
    "delivery_status",
  ] as const;
  const allowedSortFieldSet = new Set(allowedSortFields);
  const sortField =
    typeof body.sortField === "string" &&
    allowedSortFieldSet.has(
      body.sortField as (typeof allowedSortFields)[number],
    )
      ? (body.sortField as (typeof allowedSortFields)[number])
      : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Build full date range filter
  const eventTimeCondition =
    body.eventTimeFrom !== undefined && body.eventTimeFrom !== null
      ? body.eventTimeTo !== undefined && body.eventTimeTo !== null
        ? { gte: body.eventTimeFrom, lte: body.eventTimeTo }
        : { gte: body.eventTimeFrom }
      : body.eventTimeTo !== undefined && body.eventTimeTo !== null
        ? { lte: body.eventTimeTo }
        : undefined;

  // Compose where clause for Prisma query
  const where = {
    notification: { recipient_user_id: patient.id },
    ...(body.notificationId !== undefined && {
      notification_id: body.notificationId,
    }),
    ...(body.eventType !== undefined && {
      event_type: body.eventType,
    }),
    ...(body.deliveryStatus !== undefined && {
      delivery_status: body.deliveryStatus,
    }),
    ...(body.deliveryChannel !== undefined && {
      delivery_channel: body.deliveryChannel,
    }),
    ...(eventTimeCondition !== undefined && {
      event_time: eventTimeCondition,
    }),
  };

  // Query for page data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notification_history.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_notification_history.count({ where }),
  ]);

  // DTO result mapping - enforce field types strictly
  const data = rows.map((row) => {
    return {
      id: row.id,
      notification_id: row.notification_id,
      event_type: row.event_type,
      event_time: toISOStringSafe(row.event_time),
      delivery_channel: row.delivery_channel,
      delivery_status: row.delivery_status,
      details: row.details !== null ? row.details : undefined,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // Pagination object, ensure number types map correctly
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
