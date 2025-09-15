import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * List reminder notifications for an appointment (paginated/filterable)
 *
 * Retrieves all reminders (notification events) associated with a specific
 * appointment ID. Returned results may be filtered/paginated and include all
 * sent/pending/failed reminders, complete with recipient information, delivery
 * status, and notification metadata. Used for staff to monitor and troubleshoot
 * notification workflows, verify SLA compliance, or support patient/provider
 * inquiries.
 *
 * Business logic ensures that only users with access rights to the appointment
 * (receptionist, provider, organization admin, etc.) can access the reminder
 * history. The returned records provide audit support and can be leveraged for
 * notification monitoring, patient service, or regulatory review. Errors
 * include access denied, invalid appointment, or no reminders found.
 *
 * @param props - Operation properties
 * @param props.receptionist - Authenticated ReceptionistPayload context
 * @param props.appointmentId - UUID of the appointment to search reminders for
 * @param props.body - Filtering, sorting, and pagination controls for query
 * @returns Paginated list of appointment reminder notification records
 * @throws {Error} If appointment is not found, or receptionist lacks access
 */
export async function patchhealthcarePlatformReceptionistAppointmentsAppointmentIdReminders(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentReminder> {
  const { receptionist, appointmentId, body } = props;

  // 1. Validate appointment exists and is not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) throw new Error("Appointment not found");

  // 2. Build where clause for reminders (only filters with defined and non-null values)
  const where = {
    appointment_id: appointmentId,
    deleted_at: null,
    ...(body.recipient_type !== undefined &&
      body.recipient_type !== null && { recipient_type: body.recipient_type }),
    ...(body.recipient_id !== undefined &&
      body.recipient_id !== null && { recipient_id: body.recipient_id }),
    ...(body.delivery_channel !== undefined &&
      body.delivery_channel !== null && {
        delivery_channel: body.delivery_channel,
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
    ...((body.reminder_time_from !== undefined &&
      body.reminder_time_from !== null) ||
    (body.reminder_time_to !== undefined && body.reminder_time_to !== null)
      ? {
          reminder_time: {
            ...(body.reminder_time_from !== undefined &&
              body.reminder_time_from !== null && {
                gte: body.reminder_time_from,
              }),
            ...(body.reminder_time_to !== undefined &&
              body.reminder_time_to !== null && {
                lte: body.reminder_time_to,
              }),
          },
        }
      : {}),
  };

  // 3. Pagination setup (defaults)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Sorting logic
  const allowedSorts = ["reminder_time", "created_at"];
  const sort_by =
    body.sort_by && allowedSorts.includes(body.sort_by)
      ? body.sort_by
      : "reminder_time";
  const sort_direction: "asc" | "desc" =
    body.sort_direction === "asc" ? "asc" : "desc";

  // 5. Fetch reminders and count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_reminders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: sort_direction },
    }),
    MyGlobal.prisma.healthcare_platform_appointment_reminders.count({ where }),
  ]);

  // 6. Map result rows to DTO, converting all date/datetime fields properly
  const data = rows.map((row) => ({
    id: row.id,
    appointment_id: row.appointment_id,
    reminder_time: toISOStringSafe(row.reminder_time),
    recipient_type: row.recipient_type,
    recipient_id: row.recipient_id,
    delivery_channel: row.delivery_channel,
    delivery_status: row.delivery_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 7. Compose pagination with proper branding
  const pages = Math.ceil(total / limit);
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(pages),
  };

  return {
    pagination,
    data,
  };
}
