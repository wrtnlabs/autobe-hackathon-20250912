import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { IPageIHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformMedicalDoctor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Paginated search/filter for Medical Doctors (table:
 * healthcare_platform_medicaldoctors)
 *
 * Allows authorized system administrators to retrieve a paginated, filtered
 * list of Medical Doctor records for operational, credential, and analytics
 * workflows. Supports advanced search by email, NPI number, specialty, full
 * name, and creation date. Only system administrators are permitted access.
 * Filtering logic, pagination, ordering, and data mapping are performed
 * securely for compliance and dashboard use.
 *
 * @param props - Properties for operation.
 * @param props.systemAdmin - The authenticated SystemadminPayload performing
 *   the search (authorization is required).
 * @param props.body - The search, filter, and pagination criteria for Medical
 *   Doctors.
 * @returns Paginated summary information of Medical Doctor records matching
 *   filters.
 * @throws {Error} If a query or filter parameter causes an error or the user is
 *   unauthorized.
 */
export async function patchhealthcarePlatformSystemAdminMedicaldoctors(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformMedicalDoctor.IRequest;
}): Promise<IPageIHealthcarePlatformMedicalDoctor.ISummary> {
  const { body } = props;

  // Pagination defaults and max enforcement
  let page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (limit > 100) limit = 100;
  if (page < 1) page = 1;
  const skip = (page - 1) * limit;

  // Build where filter (only schema fields and allowed patterns)
  const where = {
    ...(typeof body.email === "string" &&
      body.email.length > 0 && {
        email: { contains: body.email },
      }),
    ...(typeof body.full_name === "string" &&
      body.full_name.length > 0 && {
        full_name: { contains: body.full_name },
      }),
    ...(typeof body.npi_number === "string" &&
      body.npi_number.length > 0 && {
        npi_number: body.npi_number,
      }),
    ...(typeof body.specialty === "string" &&
      body.specialty.length > 0 && {
        specialty: { contains: body.specialty },
      }),
    ...(((body.active_only ?? true) ? { deleted_at: null } : {}) as Record<
      string,
      unknown
    >),
    ...(body.created_at_from && body.created_at_to
      ? {
          created_at: {
            gte: body.created_at_from,
            lte: body.created_at_to,
          },
        }
      : body.created_at_from
        ? {
            created_at: { gte: body.created_at_from },
          }
        : body.created_at_to
          ? {
              created_at: { lte: body.created_at_to },
            }
          : {}),
  };

  // Sorting: sanitize (only allowed fields)
  const allowedOrderFields = [
    "email",
    "full_name",
    "created_at",
    "npi_number",
    "specialty",
  ];
  const order_by = allowedOrderFields.includes(body.order_by ?? "")
    ? (body.order_by as (typeof allowedOrderFields)[number])
    : "created_at";
  const order_direction = body.order_direction === "asc" ? "asc" : "desc";
  const orderBy = { [order_by]: order_direction };

  // Query main records and total count
  const [rows, records] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_medicaldoctors.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        full_name: true,
        npi_number: true,
        specialty: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_medicaldoctors.count({ where }),
  ]);

  const data = rows.map((r) => {
    const summary: IHealthcarePlatformMedicalDoctor.ISummary = {
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      npi_number: r.npi_number,
    };
    if (typeof r.specialty === "string" && r.specialty.length > 0) {
      summary.specialty = r.specialty;
    }
    return summary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: Math.ceil(records / limit),
    },
    data,
  };
}
