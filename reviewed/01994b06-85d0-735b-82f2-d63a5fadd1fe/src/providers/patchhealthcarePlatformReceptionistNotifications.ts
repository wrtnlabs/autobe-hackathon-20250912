import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * This API operation allows a receptionist to perform an advanced search for
 * notifications within their assigned organization, applying granular filters
 * and sorting options. Results are paginated, and only notifications belonging
 * to the receptionist's current organization assignment are returned. All date
 * values use ISO 8601 string format.
 *
 * @param props - Method parameters
 * @param props.receptionist - Authenticated receptionist payload (injects
 *   receptionist user context)
 * @param props.body - Filter criteria, pagination, and sorting parameters per
 *   IHealthcarePlatformNotification.IRequest
 * @returns Paginated results of notification summary objects for the
 *   receptionist's organization
 * @throws {Error} When the receptionist lacks an org assignment or attempts
 *   access outside their org boundary
 */
export async function patchhealthcarePlatformReceptionistNotifications(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { receptionist, body } = props;
  // 1. Establish organization context for this receptionist
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: receptionist.id },
    });
  if (!assignment) {
    throw new Error("Receptionist is not assigned to any organization");
  }
  const orgId: string & tags.Format<"uuid"> =
    assignment.healthcare_platform_organization_id;

  // 2. If body.organizationId is present, it must match receptionist's org
  if (body.organizationId && body.organizationId !== orgId) {
    throw new Error(
      "Forbidden: Can only access notifications for your assigned organization",
    );
  }

  // 3. Pagination arguments
  const pageNum = body.page && body.page >= 1 ? Number(body.page) : 1;
  const limitNum = body.limit && body.limit >= 1 ? Number(body.limit) : 20;
  const skipNum = (pageNum - 1) * limitNum;

  // 4. Build where condition for Prisma
  const where: Record<string, unknown> = { organization_id: orgId };
  if (body.notificationType) where.notification_type = body.notificationType;
  if (body.notificationChannel)
    where.notification_channel = body.notificationChannel;
  if (body.recipientUserId) where.recipient_user_id = body.recipientUserId;
  if (body.deliveryStatus) where.delivery_status = body.deliveryStatus;
  if (body.critical !== undefined) where.critical = body.critical;
  if (body.startDate || body.endDate) {
    where.created_at = {};
    if (body.startDate)
      (where.created_at as Record<string, string>).gte = body.startDate;
    if (body.endDate)
      (where.created_at as Record<string, string>).lte = body.endDate;
  }

  // 5. Sorting (securely allow only known sort fields and directions)
  let orderBy: Record<string, "asc" | "desc">;
  switch ((body.sortField || "").toLowerCase()) {
    case "createdat":
    case "created_at":
      orderBy = { created_at: body.sortOrder === "asc" ? "asc" : "desc" };
      break;
    case "critical":
      orderBy = { critical: body.sortOrder === "asc" ? "asc" : "desc" };
      break;
    case "deliverystatus":
    case "delivery_status":
      orderBy = { delivery_status: body.sortOrder === "asc" ? "asc" : "desc" };
      break;
    default:
      orderBy = { created_at: "desc" };
  }

  // 6. Query notification data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where,
      orderBy,
      skip: skipNum,
      take: limitNum,
      select: {
        id: true,
        notification_type: true,
        notification_channel: true,
        critical: true,
        delivery_status: true,
        created_at: true,
        subject: true,
        delivered_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_notifications.count({ where }),
  ]);

  // 7. Map to ISummary output
  const data = rows.map((row) => ({
    id: row.id,
    notificationType: row.notification_type,
    notificationChannel: row.notification_channel,
    critical: row.critical,
    deliveryStatus: row.delivery_status,
    createdAt: toISOStringSafe(row.created_at),
    ...(row.subject !== null && { subject: row.subject }),
    ...(row.delivered_at !== null &&
      row.delivered_at !== undefined && {
        deliveredAt: toISOStringSafe(row.delivered_at),
      }),
  }));

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limitNum)),
    },
    data,
  };
}
