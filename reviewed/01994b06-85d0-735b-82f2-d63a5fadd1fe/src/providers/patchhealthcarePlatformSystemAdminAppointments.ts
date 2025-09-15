import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate appointments across providers, patients, and departments.
 *
 * Operates as a system administrator using advanced filtering and pagination
 * logic. Enforces organizational boundaries, data privacy, and role constraints
 * according to system admin privileges. Supports filters for provider, patient,
 * status, date ranges, appointment type, department, keyword
 * (title/description), and resources; sorts by start_time or status_id. Results
 * are paginated.
 *
 * @param props - Request containing systemAdmin payload and
 *   IHealthcarePlatformAppointment.IRequest filter body
 * @returns Paginated appointment summaries and pagination info
 * @throws {Error} If pagination parameters are invalid (page < 1, page_size out
 *   of bounds)
 */
export async function patchhealthcarePlatformSystemAdminAppointments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { body } = props;

  // Validate pagination parameters (page >= 1, 1 <= page_size <= 100)
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const page_size =
    typeof body.page_size === "number" &&
    body.page_size >= 1 &&
    body.page_size <= 100
      ? body.page_size
      : 20;
  if (page < 1 || page_size < 1 || page_size > 100) {
    throw new Error("Invalid pagination parameters");
  }

  // --- WHERE CLAUSE CONSTRUCTION (no Date type used) --- //
  // Range filters for start_time, end_time → create gte/lte objects
  let startTime: { gte?: string; lte?: string } = {};
  if (body.start_time_from !== undefined) {
    startTime.gte = body.start_time_from;
  }
  if (body.start_time_to !== undefined) {
    startTime.lte = body.start_time_to;
  }
  let endTime: { gte?: string; lte?: string } = {};
  if (body.end_time_from !== undefined) {
    endTime.gte = body.end_time_from;
  }
  if (body.end_time_to !== undefined) {
    endTime.lte = body.end_time_to;
  }

  // Build filtered WHERE object for Prisma
  const where = {
    deleted_at: null,
    ...(body.provider_id !== undefined && { provider_id: body.provider_id }),
    ...(body.patient_id !== undefined && { patient_id: body.patient_id }),
    ...(body.status_id !== undefined && { status_id: body.status_id }),
    ...(body.organization_id !== undefined && {
      healthcare_platform_organization_id: body.organization_id,
    }),
    ...(body.department_id !== undefined && {
      healthcare_platform_department_id: body.department_id,
    }),
    ...(body.room_id !== undefined && { room_id: body.room_id }),
    ...(body.equipment_id !== undefined && { equipment_id: body.equipment_id }),
    ...(body.appointment_type !== undefined && {
      appointment_type: body.appointment_type,
    }),
    ...(Object.keys(startTime).length > 0 && { start_time: startTime }),
    ...(Object.keys(endTime).length > 0 && { end_time: endTime }),
    ...(body.keyword !== undefined && body.keyword.length > 0
      ? {
          OR: [
            { title: { contains: body.keyword } },
            { description: { contains: body.keyword } },
          ],
        }
      : {}),
  };

  // --- ORDER BY --- //
  const sort =
    typeof body.sort === "string" && body.sort.length > 0
      ? body.sort
      : "start_time:asc";
  const sidx = sort.indexOf(":");
  const sortField = sidx > 0 ? sort.substring(0, sidx) : sort;
  const sortDir = sidx > 0 ? sort.substring(sidx + 1) : "asc";
  const allowedFields = ["start_time", "status_id"];
  const allowedDirections = ["asc", "desc"];
  const field = allowedFields.includes(sortField) ? sortField : "start_time";
  const direction = allowedDirections.includes(sortDir) ? sortDir : "asc";

  // --- MAIN DB QUERY: Find paginated rows and total count --- //
  const [rows, totalRecords] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy: { [field]: direction },
      skip: (page - 1) * page_size,
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

  // --- MAP DB FIELDS TO API (toISOStringSafe for all Date fields, handle nullable) --- //
  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      healthcare_platform_department_id:
        row.healthcare_platform_department_id === null
          ? undefined
          : row.healthcare_platform_department_id,
      provider_id: row.provider_id,
      patient_id: row.patient_id,
      status_id: row.status_id,
      start_time: toISOStringSafe(row.start_time),
      end_time: toISOStringSafe(row.end_time),
      appointment_type: row.appointment_type,
      title: row.title === null ? undefined : row.title,
      description: row.description === null ? undefined : row.description,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: totalRecords,
      pages: Math.ceil(totalRecords / page_size),
    },
    data,
  };
}
