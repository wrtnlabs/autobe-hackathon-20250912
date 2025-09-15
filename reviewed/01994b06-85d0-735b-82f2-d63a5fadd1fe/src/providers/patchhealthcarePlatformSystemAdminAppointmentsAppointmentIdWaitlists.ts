import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This operation retrieves the waitlist for a specified appointment in the
 * healthcare platform, returning a paginated, filtered list of users waiting
 * for a slot. It supports advanced query features such as filtering by patient,
 * waitlist entry status, or join time range. Authorization is strictly
 * enforced; as a system admin, full access to the waitlist is allowed.
 * Sensitive fields and PHI are only exposed within business boundaries. Result
 * includes pagination metadata and summary waitlist entries by appointment.
 *
 * @param props - Parameters for this operation
 * @param props.systemAdmin - Authenticated SystemadminPayload
 * @param props.appointmentId - UUID of the appointment
 * @param props.body - Filtering and pagination options for the waitlist query
 * @returns A paginated summary list of appointment waitlist entries
 * @throws {Error} If the specified appointment does not exist or access is not
 *   allowed
 */
export async function patchhealthcarePlatformSystemAdminAppointmentsAppointmentIdWaitlists(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { appointmentId, body } = props;
  // 1. Validate appointment exists
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
      select: { id: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // 2. Pagination controls
  const pageRaw = body.page;
  const page_sizeRaw = body.page_size;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const page_size =
    typeof page_sizeRaw === "number" && page_sizeRaw > 0 ? page_sizeRaw : 20;
  const skip = (page - 1) * page_size;
  const take = page_size;

  // 3. Build WHERE clause (only allowed fields)
  const where = {
    appointment_id: appointmentId,
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
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

  // 4. Retrieve data and count in parallel
  const [total, list] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: { join_time: "desc" },
      skip,
      take,
    }),
  ]);

  // 5. Map records to output format (with type safety and branded values)
  const data = list.map((item) => ({
    id: item.id,
    appointment_id: item.appointment_id,
    patient_id: item.patient_id,
    join_time: toISOStringSafe(item.join_time),
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

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
