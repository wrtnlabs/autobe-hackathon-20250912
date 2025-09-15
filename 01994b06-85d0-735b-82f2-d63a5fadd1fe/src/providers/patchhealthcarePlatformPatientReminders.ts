import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Search and list reminders with filter, sorting, and pagination.
 *
 * Obtain a filtered and paginated list of reminders stored in the platform,
 * filtered by user role and query parameters.
 *
 * The reminders system delivers scheduled notifications to users and staff
 * (e.g., appointment, compliance, medication). This operation enables
 * searching, filtering, and sorting reminders according to criteria such as
 * recipient, status, time window, delivery outcome, and organization context,
 * supporting bulk reminder management or analytics. Authorization is required
 * for any user account able to view reminders in their organization scope;
 * compliance and privacy rules apply.
 *
 * This endpoint operates on the healthcare_platform_reminders table, returning
 * reminder summaries and supporting paging through large volumes of data.
 * Related endpoints include single reminder fetch and reminder creation.
 *
 * @param props - Parameters object
 * @param props.patient - The authenticated patient requesting their reminders
 *   (authorization required)
 * @param props.body - Search and filter parameters for retrieving reminders
 *   (recipient, status, scheduled window, etc.) with pagination and sorting
 * @returns Paginated result set of reminder summary data per search criteria
 * @throws {Error} If the underlying database operation fails or an internal
 *   error occurs
 */
export async function patchhealthcarePlatformPatientReminders(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { patient, body } = props;

  // Pagination defaults (ensure plain numbers for Prisma)
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Allowed sort fields for ISummary
  const allowedSortFields = [
    "scheduled_for",
    "reminder_type",
    "status",
    "reminder_message",
  ];

  // Determine sort field and direction
  let orderBy: Record<string, "asc" | "desc"> = { scheduled_for: "desc" };
  if (body.sort !== undefined && body.sort !== null && body.sort.length > 0) {
    let field = body.sort;
    let direction: "asc" | "desc" = "asc";
    if (field.startsWith("-")) {
      field = field.slice(1);
      direction = "desc";
    } else if (field.startsWith("+")) {
      field = field.slice(1);
      direction = "asc";
    }
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Build where condition for Prisma (all conditions combined)
  const where = {
    deleted_at: null,
    target_user_id: patient.id,
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.reminder_type !== undefined &&
      body.reminder_type !== null && { reminder_type: body.reminder_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.reminder_message !== undefined &&
      body.reminder_message !== null &&
      body.reminder_message.length > 0 && {
        reminder_message: { contains: body.reminder_message },
      }),
    ...(body.failure_reason !== undefined &&
      body.failure_reason !== null &&
      body.failure_reason.length > 0 && {
        failure_reason: { contains: body.failure_reason },
      }),
    ...((body.scheduled_for_from !== undefined &&
      body.scheduled_for_from !== null) ||
    (body.scheduled_for_to !== undefined && body.scheduled_for_to !== null)
      ? {
          scheduled_for: {
            ...(body.scheduled_for_from !== undefined &&
              body.scheduled_for_from !== null && {
                gte: body.scheduled_for_from,
              }),
            ...(body.scheduled_for_to !== undefined &&
              body.scheduled_for_to !== null && { lte: body.scheduled_for_to }),
          },
        }
      : {}),
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
    ...((body.acknowledged_at_from !== undefined &&
      body.acknowledged_at_from !== null) ||
    (body.acknowledged_at_to !== undefined && body.acknowledged_at_to !== null)
      ? {
          acknowledged_at: {
            ...(body.acknowledged_at_from !== undefined &&
              body.acknowledged_at_from !== null && {
                gte: body.acknowledged_at_from,
              }),
            ...(body.acknowledged_at_to !== undefined &&
              body.acknowledged_at_to !== null && {
                lte: body.acknowledged_at_to,
              }),
          },
        }
      : {}),
  };

  // Query results and total count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_reminders.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        reminder_type: true,
        reminder_message: true,
        scheduled_for: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_reminders.count({ where }),
  ]);

  // Transform records (map and convert scheduled_for to string & tags.Format<'date-time'>)
  const data = records.map((reminder) => {
    return {
      id: reminder.id,
      reminder_type: reminder.reminder_type,
      reminder_message: reminder.reminder_message,
      scheduled_for: toISOStringSafe(reminder.scheduled_for),
      status: reminder.status,
    };
  });

  // Build pagination info
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { pagination, data };
}
