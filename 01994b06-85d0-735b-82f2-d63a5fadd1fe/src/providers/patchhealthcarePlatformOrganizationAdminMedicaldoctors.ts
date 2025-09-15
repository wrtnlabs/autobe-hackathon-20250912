import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { IPageIHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformMedicalDoctor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Paginated search/filter for Medical Doctors (table:
 * healthcare_platform_medicaldoctors)
 *
 * This operation allows organization administrators to retrieve a paginated,
 * filtered list of Medical Doctor records from the healthcarePlatform system,
 * supporting advanced search by email, NPI number, specialty, full name, and
 * date created. Results are suitable for dashboards, credentialing, and
 * compliance operations. Only authenticated organization admins may call this
 * operation.
 *
 * @param props - Object containing search, filter, pagination, and
 *   authentication.
 * @param props.organizationAdmin - Authenticated organization admin requesting
 *   the results.
 * @param props.body - Filters and pagination configuration for the query (see
 *   IHealthcarePlatformMedicalDoctor.IRequest).
 * @returns Paginated summary of Medical Doctor records matching the provided
 *   filters.
 * @throws {Error} If a database error occurs or parameters fail (though
 *   upstream validation assumed).
 */
export async function patchhealthcarePlatformOrganizationAdminMedicaldoctors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformMedicalDoctor.IRequest;
}): Promise<IPageIHealthcarePlatformMedicalDoctor.ISummary> {
  const { body } = props;
  const take =
    body.limit ?? (20 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (Number(page) - 1) * Number(take);

  // Construct filtering criteria
  const where: Record<string, unknown> = {
    ...(body.email ? { email: { contains: body.email } } : {}),
    ...(body.full_name ? { full_name: { contains: body.full_name } } : {}),
    ...(body.npi_number ? { npi_number: body.npi_number } : {}),
    ...(body.specialty ? { specialty: { contains: body.specialty } } : {}),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from ? { gte: body.created_at_from } : {}),
            ...(body.created_at_to ? { lte: body.created_at_to } : {}),
          },
        }
      : {}),
    ...(body.active_only === true ? { deleted_at: null } : {}),
  };

  // Determine sort field and direction
  const allowedOrderFields = [
    "email",
    "full_name",
    "created_at",
    "npi_number",
    "specialty",
  ] as const;
  const orderField =
    body.order_by && allowedOrderFields.includes(body.order_by)
      ? body.order_by
      : "full_name";
  const orderDir = body.order_direction === "desc" ? "desc" : "asc";

  // Run queries for result page and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_medicaldoctors.findMany({
      where,
      skip: skip,
      take: Number(take),
      orderBy: { [orderField]: orderDir },
      select: {
        id: true,
        full_name: true,
        email: true,
        npi_number: true,
        specialty: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_medicaldoctors.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / Number(take)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => {
      // specialty: optional + nullable + undefined permitted in ISummary
      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        npi_number: row.npi_number,
        ...(row.specialty !== undefined && row.specialty !== null
          ? { specialty: row.specialty }
          : {}),
      };
    }),
  };
}
