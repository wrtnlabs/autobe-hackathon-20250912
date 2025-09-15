import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { IPageIHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentStatus";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * List and search all appointment statuses in the scheduling module.
 *
 * This API operation retrieves a paginated, filterable, and sortable list of
 * appointment statuses from the healthcare_platform_appointment_statuses table.
 * It supports searching by status_code, display_name, and business_status, and
 * returns pagination metadata.
 *
 * Receptionists and staff with scheduling management privileges may use this
 * endpoint to configure workflows, power UI controls, or perform analytics over
 * appointment status values.
 *
 * @param props - Operation parameters
 * @param props.receptionist - Authenticated receptionist user (authorization
 *   via payload).
 * @param props.body - Filter, sort, and pagination options for appointment
 *   status query.
 * @returns Paginated response containing summary details of all matched
 *   appointment statuses.
 * @throws {Error} When input pagination arguments are invalid (negative values,
 *   etc)
 */
export async function patchhealthcarePlatformReceptionistAppointmentStatuses(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformAppointmentStatus.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentStatus.ISummary> {
  const { body } = props;

  // Ensure page and limit are safe positive ints
  const page: number =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit: number =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip: number = (page - 1) * limit;

  // Construct where clause only for provided fields
  const where = {
    ...(typeof body.status_code === "string" &&
      body.status_code.length > 0 && {
        status_code: body.status_code,
      }),
    ...(typeof body.display_name === "string" &&
      body.display_name.length > 0 && {
        display_name: { contains: body.display_name },
      }),
    ...(typeof body.business_status === "string" &&
      body.business_status.length > 0 && {
        business_status: body.business_status,
      }),
    ...(typeof body.sort_order === "number" && {
      sort_order: body.sort_order,
    }),
  };

  // Always sort ascending by sort_order with display_name as tie-breaker
  // Define each order field as a separate object with the value as literal for type safety
  // DO NOT create an array of union types (see Prisma typing)
  const orderBy = [
    { sort_order: "asc" as const },
    { display_name: "asc" as const },
  ];

  // Query data and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_statuses.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_statuses.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      status_code: row.status_code,
      display_name: row.display_name,
      business_status:
        typeof row.business_status === "string" &&
        row.business_status.length > 0
          ? row.business_status
          : undefined,
      sort_order: row.sort_order,
    })),
  };
}
