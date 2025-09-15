import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * List reminder notifications for an appointment (paginated/filterable)
 *
 * Retrieves all reminders (notification events) associated with a specific
 * appointment ID. Results can be filtered by recipient, delivery channel,
 * delivery status, or scheduled time window, and are returned in paginated
 * format. Designed for medical doctors to retrieve history and status of
 * reminders they own.
 *
 * Authorization ensures only the appointment provider can access reminder
 * history. Excludes soft-deleted reminders. Strict field validation and
 * functional style.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - Authenticated doctor for access and audit
 * @param props.appointmentId - Appointment UUID whose reminders to list
 * @param props.body - Filtering, sorting, and pagination criteria
 * @returns Paginated list of appointment reminders matching criteria
 * @throws {Error} If unauthorized, appointment not found, or validation fails
 */
export async function patchhealthcarePlatformMedicalDoctorAppointmentsAppointmentIdReminders(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentReminder> {
  const { medicalDoctor, appointmentId, body } = props;

  // Step 1: Authorization and appointment existence check
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        provider_id: medicalDoctor.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found or access denied to reminders");
  }

  // Step 2: Parse and validate pagination
  const pageRaw = body.page !== undefined && body.page !== null ? body.page : 1;
  const limitRaw =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const page = Number(pageRaw) > 0 ? Number(pageRaw) : 1;
  const limit = Number(limitRaw) > 0 ? Number(limitRaw) : 20;
  const skip = (page - 1) * limit;

  // Step 3: Sorting
  const allowedSortFields = ["reminder_time", "created_at", "updated_at"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "reminder_time")
    : "reminder_time";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Step 4: Dynamic where clause with only valid, present fields
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
              body.reminder_time_to !== null && { lte: body.reminder_time_to }),
          },
        }
      : {}),
  };

  // Step 5: Query data and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_reminders.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_reminders.count({ where }),
  ]);

  // Step 6: Map and transform results (all Date to string & tags.Format<'date-time'>)
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

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
