import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Search and paginate scheduled appointments (receptionist scoped).
 *
 * This operation retrieves a paginated set of appointment summary records for
 * the receptionist's organization, supporting advanced filters (provider,
 * patient, status, type, date range, keyword), customizable sorting, and robust
 * pagination. Strictly enforces data access boundaries—appointments are only
 * visible for the calling receptionist's organization.
 *
 * Date values are returned as ISO8601 strings (no Date type leakage); all types
 * and field presence/absence are respected per API contract.
 *
 * @param props Object containing authentication and search/filter criteria
 * @param props.receptionist The authenticated receptionist user (authorization
 *   context)
 * @param props.body Search and filter criteria for appointments
 * @returns Paginated list of appointment summaries, suitable for calendars or
 *   dashboards
 * @throws {Error} If any step of the query fails
 */
export async function patchhealthcarePlatformReceptionistAppointments(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { receptionist, body } = props;

  // Pagination (ensure valid int, defaults)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const page_size =
    typeof body.page_size === "number" && body.page_size > 0
      ? body.page_size
      : 20;
  const skip = (page - 1) * page_size;

  // Build start_time, end_time range filters
  const startTime: Record<string, string & tags.Format<"date-time">> = {};
  if (body.start_time_from !== undefined)
    startTime["gte"] = body.start_time_from;
  if (body.start_time_to !== undefined) startTime["lte"] = body.start_time_to;
  const endTime: Record<string, string & tags.Format<"date-time">> = {};
  if (body.end_time_from !== undefined) endTime["gte"] = body.end_time_from;
  if (body.end_time_to !== undefined) endTime["lte"] = body.end_time_to;

  // Build where clause, strictly enforcing receptionist's org
  const where = {
    deleted_at: null,
    healthcare_platform_organization_id: receptionist.id,
    ...(body.provider_id !== undefined &&
      body.provider_id !== null && { provider_id: body.provider_id }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...(body.status_id !== undefined &&
      body.status_id !== null && { status_id: body.status_id }),
    ...(body.appointment_type !== undefined &&
      body.appointment_type !== null && {
        appointment_type: body.appointment_type,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        healthcare_platform_department_id: body.department_id,
      }),
    ...(body.room_id !== undefined &&
      body.room_id !== null && { room_id: body.room_id }),
    ...(body.equipment_id !== undefined &&
      body.equipment_id !== null && { equipment_id: body.equipment_id }),
    ...(Object.keys(startTime).length > 0 && { start_time: startTime }),
    ...(Object.keys(endTime).length > 0 && { end_time: endTime }),
    ...(body.keyword !== undefined &&
      body.keyword !== null &&
      body.keyword.length > 0 && {
        OR: [
          { title: { contains: body.keyword } },
          { description: { contains: body.keyword } },
        ],
      }),
  };

  // Sorting logic
  const allowedSortFields = [
    "start_time",
    "end_time",
    "status_id",
    "provider_id",
    "patient_id",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { start_time: "desc" };
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const [rawField, dirRaw] = body.sort.split(":");
    const dir = dirRaw === "asc" ? "asc" : "desc";
    if (allowedSortFields.includes(rawField)) {
      orderBy = { [rawField]: dir };
    }
  }

  // Query appointments (paged + total count)
  const [results, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy,
      skip,
      take: page_size,
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        healthcare_platform_department_id: true,
        provider_id: true,
        patient_id: true,
        status_id: true,
        start_time: true,
        end_time: true,
        appointment_type: true,
        title: true,
        description: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_appointments.count({ where }),
  ]);

  // Map each record to ISummary output
  const mapped = results.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      row.healthcare_platform_department_id ?? null,
    provider_id: row.provider_id,
    patient_id: row.patient_id,
    status_id: row.status_id,
    start_time: toISOStringSafe(row.start_time),
    end_time: toISOStringSafe(row.end_time),
    appointment_type: row.appointment_type,
    title: row.title ?? null,
    description: row.description ?? null,
  }));

  // Build pagination meta (ensuring correct types and branding)
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: mapped,
  };
}
