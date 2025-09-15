import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This operation allows a medical doctor to query the waitlist for a specific
 * appointment, including filters for patient, join times, and status, while
 * enforcing authorization so that only the doctor assigned as provider can view
 * entries. The result is paginated and includes summary information for each
 * waitlist entry.
 *
 * @param props - The request parameter object
 * @param props.medicalDoctor - The currently authenticated medical doctor
 *   (provider) making the request
 * @param props.appointmentId - The appointment for which to retrieve the
 *   waitlist
 * @param props.body - The waitlist filter/pagination request parameters
 * @returns Paginated summary of waitlist entries for the specified appointment
 * @throws {Error} When the appointment does not exist or the medical doctor is
 *   not the provider
 */
export async function patchhealthcarePlatformMedicalDoctorAppointmentsAppointmentIdWaitlists(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { medicalDoctor, appointmentId, body } = props;

  // 1. Authorization: ensure this doctor is the provider for the appointment
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.provider_id !== medicalDoctor.id)
    throw new Error("Unauthorized: Only the provider doctor can view waitlist");

  // 2. Build dynamic WHERE clause with safe null/undefined checks
  const where: Record<string, any> = {
    appointment_id: appointmentId,
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.patient_id !== undefined ? { patient_id: body.patient_id } : {}),
    ...(body.join_time_from !== undefined || body.join_time_to !== undefined
      ? {
          join_time: {
            ...(body.join_time_from !== undefined
              ? { gte: body.join_time_from }
              : {}),
            ...(body.join_time_to !== undefined
              ? { lte: body.join_time_to }
              : {}),
          },
        }
      : {}),
  };

  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (page - 1) * page_size;
  const take = page_size;

  // 3. Fetch paginated data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: { join_time: "asc" },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
  ]);

  // 4. Transform to ISummary and convert date fields to string & tags.Format<'date-time'>
  const data = rows.map((row) => ({
    id: row.id,
    appointment_id: row.appointment_id,
    patient_id: row.patient_id,
    join_time: toISOStringSafe(row.join_time),
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 5. Pagination info with number branding
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data,
  };
}
