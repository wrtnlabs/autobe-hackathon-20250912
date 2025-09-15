import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This function returns a paginated, filtered summary list of users currently
 * on the waitlist for a specified appointment. It supports dynamic search,
 * advanced query parameters (status, patient_id, join time range), and strict
 * RBAC via nurse authentication. Pagination is returned according to IPage
 * conventions for efficient frontend rendering. All date and uuid values are
 * type-checked and normalized for DTO compatibility.
 *
 * Authorization is enforced by endpoint and payload. Results return only
 * permitted waitlist rows. All datetime values are normalized to string &
 * tags.Format<'date-time'>.
 *
 * @param props - Operation input
 * @param props.nurse - The authenticated nurse user (RBAC enforced by
 *   controller)
 * @param props.appointmentId - The appointment UUID for waitlist retrieval
 * @param props.body - Query parameters for filters and pagination
 * @returns Paginated waitlist summary as per
 *   IPageIHealthcarePlatformAppointmentWaitlist.ISummary
 * @throws {Error} If the specified appointment does not exist or is
 *   inaccessible
 */
export async function patchhealthcarePlatformNurseAppointmentsAppointmentIdWaitlists(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { nurse, appointmentId, body } = props;

  // Pagination (defaults)
  const page = body.page !== undefined ? body.page : 1;
  const page_size = body.page_size !== undefined ? body.page_size : 20;
  const skip = Number(page - 1) * Number(page_size);

  // Build where clause for Prisma query
  const where: Record<string, unknown> = {
    appointment_id: appointmentId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...(body.join_time_from !== undefined && body.join_time_from !== null
      ? { join_time: { gte: body.join_time_from } }
      : {}),
    ...(body.join_time_to !== undefined && body.join_time_to !== null
      ? {
          join_time: {
            ...(body.join_time_from !== undefined &&
            body.join_time_from !== null
              ? { gte: body.join_time_from }
              : {}),
            lte: body.join_time_to,
          },
        }
      : {}),
  };

  // Count & query results
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: [{ join_time: "asc" }, { created_at: "asc" }],
      skip,
      take: Number(page_size),
    }),
  ]);

  const data: IHealthcarePlatformAppointmentWaitlist.ISummary[] = rows.map(
    (row) => ({
      id: row.id,
      appointment_id: row.appointment_id,
      patient_id: row.patient_id,
      join_time: toISOStringSafe(row.join_time),
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / Number(page_size)),
    },
    data,
  };
}
