import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Retrieve waitlist entries for a specific appointment for the authenticated
 * patient user.
 *
 * Only returns waitlist records belonging to the authenticated patient for the
 * given appointment. Supports filtering by status, join time, and paginated
 * result sets. All date/datetime values use ISO 8601 string format with typia
 * branding. Functional and immutable code structure, no native Date usage, and
 * no type assertion via as.
 *
 * @param props - Properties containing patient authentication, appointmentId,
 *   and filter/body request
 * @param props.patient - PatientPayload (authenticated patient JWT payload)
 * @param props.appointmentId - UUID of the target appointment to retrieve
 *   waitlist for
 * @param props.body - Request filter: may include status, join_time_from,
 *   join_time_to, pagination
 * @returns IPageIHealthcarePlatformAppointmentWaitlist.ISummary
 * @throws {Error} If the appointmentId does not exist or patient has no access
 *   to its waitlist
 */
export async function patchhealthcarePlatformPatientAppointmentsAppointmentIdWaitlists(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { patient, appointmentId, body } = props;
  const page =
    typeof body.page === "number" && Number.isFinite(body.page) ? body.page : 1;
  const page_size =
    typeof body.page_size === "number" && Number.isFinite(body.page_size)
      ? body.page_size
      : 20;

  // Validate appointment existence (patient only allowed to see their own waitlist entries)
  const appointmentExists =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
    });
  if (!appointmentExists) {
    throw new Error("Appointment not found.");
  }

  // Build advanced where clause with only patient entries
  const baseWhere: Record<string, unknown> = {
    appointment_id: appointmentId,
    patient_id: patient.id,
  };
  if (typeof body.status === "string" && body.status.length > 0) {
    baseWhere.status = body.status;
  }

  // Join time filters
  if (
    (typeof body.join_time_from === "string" &&
      body.join_time_from.length > 0) ||
    (typeof body.join_time_to === "string" && body.join_time_to.length > 0)
  ) {
    baseWhere.join_time = {
      ...(typeof body.join_time_from === "string" &&
      body.join_time_from.length > 0
        ? { gte: body.join_time_from }
        : {}),
      ...(typeof body.join_time_to === "string" && body.join_time_to.length > 0
        ? { lte: body.join_time_to }
        : {}),
    };
  }

  // Query paginated rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where: baseWhere,
      orderBy: { join_time: "asc" },
      skip: (page - 1) * page_size,
      take: page_size,
      select: {
        id: true,
        appointment_id: true,
        patient_id: true,
        join_time: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({
      where: baseWhere,
    }),
  ]);

  // Map to DTO with string-based branded date/time fields, no assertions, fully typed
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(page_size)),
    },
    data: rows.map((row) => ({
      id: row.id,
      appointment_id: row.appointment_id,
      patient_id: row.patient_id,
      join_time: toISOStringSafe(row.join_time),
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
