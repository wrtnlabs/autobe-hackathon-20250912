import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsNotificationLog";
import { IPageIEnterpriseLmsNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsNotificationLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of notification logs.
 *
 * Retrieves notification logs from the Enterprise LMS system based on filtering
 * criteria such as tenant ID, notification type, recipient, delivery status,
 * and sent timestamp ranges. Supports pagination and sorting by sent, created,
 * or updated timestamps.
 *
 * Authorization: Restricted to authenticated system administrators.
 *
 * @param props - Object containing systemAdmin auth payload and request body
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.body - Request body with filters and pagination info
 * @returns Paginated list of notification log summaries matching filters
 * @throws {Error} Throws on any database or server errors
 */
export async function patchenterpriseLmsSystemAdminNotificationLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsNotificationLog.IRequest;
}): Promise<IPageIEnterpriseLmsNotificationLog.ISummary> {
  const { systemAdmin, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  const where: Parameters<
    typeof MyGlobal.prisma.enterprise_lms_notification_logs.findMany
  >[0]["where"] = {
    deleted_at: null,
    ...(body.tenant_id !== undefined &&
      body.tenant_id !== null && { tenant_id: body.tenant_id }),
    ...(body.notification_type !== undefined &&
      body.notification_type !== null && {
        notification_type: { contains: body.notification_type },
      }),
    ...(body.recipient_identifier !== undefined &&
      body.recipient_identifier !== null && {
        recipient_identifier: { contains: body.recipient_identifier },
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
    ...((body.sent_at_from !== undefined && body.sent_at_from !== null) ||
    (body.sent_at_to !== undefined && body.sent_at_to !== null)
      ? {
          sent_at: {
            ...(body.sent_at_from !== undefined &&
              body.sent_at_from !== null && { gte: body.sent_at_from }),
            ...(body.sent_at_to !== undefined &&
              body.sent_at_to !== null && { lte: body.sent_at_to }),
          },
        }
      : {}),
  };

  const validOrderFields = ["sent_at", "created_at", "updated_at"] as const;
  const orderField = validOrderFields.includes(body.order_by ?? "")
    ? (body.order_by as (typeof validOrderFields)[number])
    : "sent_at";
  const orderDirection = body.direction === "asc" ? "asc" : "desc";

  const skip = page * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_notification_logs.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_notification_logs.count({ where }),
  ]);

  const data: IEnterpriseLmsNotificationLog.ISummary[] = results.map(
    (item) => ({
      id: item.id,
      notification_type: item.notification_type,
      recipient_identifier: item.recipient_identifier,
      delivery_status: item.delivery_status,
      sent_at: item.sent_at ? toISOStringSafe(item.sent_at) : undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    }),
  );

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
