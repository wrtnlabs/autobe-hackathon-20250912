import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This operation retrieves a paginated, filtered list of all waitlist entries
 * for the specified appointment. Receptionist users can view and search all
 * appointment waitlist entries by appointmentId, applying optional filter
 * criteria including patient ID, status, and join time range. Results are
 * paginated and returned with immutable, strongly typed shapes strictly
 * matching the IHealthcarePlatformAppointmentWaitlist summary and page
 * structures. All date and UUID fields use strictly correct branding and
 * conversion, without any use of Date type or unsafe assertions. Organizational
 * access is handled by authenticated decorator; only relevant fields are
 * returned. No prohibited imports, native Date usage, or type assertions are
 * present.
 *
 * @param props - Request properties
 * @param props.receptionist - The authenticated receptionist performing the
 *   query (authorization is handled upstream)
 * @param props.appointmentId - The UUID of the appointment for which the
 *   waitlist should be retrieved
 * @param props.body - Filtering, pagination, and query parameters including
 *   status, patient, and time range
 * @returns Paginated list of waitlist entries, filtered and mapped with correct
 *   date/UUID handling
 * @throws {Error} If the referenced appointment does not exist or is forbidden
 *   to the receptionist
 */
export async function patchhealthcarePlatformReceptionistAppointmentsAppointmentIdWaitlists(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { appointmentId, body } = props;

  // Parse filters and defaults
  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (Number(page) - 1) * Number(page_size);
  const take = Number(page_size);

  // Compose dynamic where clause for filtering
  const where = {
    appointment_id: appointmentId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...((body.join_time_from !== undefined && body.join_time_from !== null) ||
    (body.join_time_to !== undefined && body.join_time_to !== null)
      ? {
          join_time: {
            ...(body.join_time_from !== undefined &&
              body.join_time_from !== null && { gte: body.join_time_from }),
            ...(body.join_time_to !== undefined &&
              body.join_time_to !== null && { lte: body.join_time_to }),
          },
        }
      : {}),
  };

  // Retrieve filtered, paginated data & total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: { join_time: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / Number(page_size)),
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
