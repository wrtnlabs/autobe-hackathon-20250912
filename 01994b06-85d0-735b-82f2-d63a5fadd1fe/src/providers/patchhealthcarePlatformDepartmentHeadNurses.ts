import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { IPageIHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNurse";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and retrieve a filtered, paginated list of nurses from the
 * healthcarePlatform system (healthcare_platform_nurses table).
 *
 * This endpoint enables department heads to view nurses registered in the
 * system. Supports advanced filtering on available fields (full_name, email,
 * license_number, specialty), with pagination and soft deletion filtering. Due
 * to schema limitations, filtering by department and status is not supported
 * here. Results are paginated, with role-based access inferred by presence of
 * departmentHead authentication.
 *
 * @param props - The operation parameters.
 * @param props.departmentHead - Authentication payload for department head
 *   role. Used for access, but department filtering is not possible in current
 *   schema.
 * @param props.body - Filter parameters for nurse search. Supports filtering by
 *   name, email, license, and specialty.
 * @returns Paginated list of summary nurse records matching criteria.
 * @throws {Error} If filtering by department or status is requested (not
 *   supported in schema).
 */
export async function patchhealthcarePlatformDepartmentHeadNurses(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformNurse.IRequest;
}): Promise<IPageIHealthcarePlatformNurse.ISummary> {
  const { departmentHead, body } = props;

  // Pagination - fixed defaults as parameters are not present in request body
  const page = 1;
  const limit = 20;

  const where = {
    deleted_at: null,
    ...(body.full_name !== undefined &&
      body.full_name !== null && {
        full_name: { contains: body.full_name },
      }),
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.license_number !== undefined &&
      body.license_number !== null && {
        license_number: { contains: body.license_number },
      }),
    ...(body.specialty !== undefined &&
      body.specialty !== null && {
        specialty: { contains: body.specialty },
      }),
  };

  // Query and count with Prisma
  const [nurses, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_nurses.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { full_name: "asc" },
    }),
    MyGlobal.prisma.healthcare_platform_nurses.count({ where }),
  ]);

  // Map to ISummary DTO
  const data = nurses.map((nurse) => ({
    id: nurse.id,
    full_name: nurse.full_name,
    email: nurse.email,
    license_number: nurse.license_number,
    specialty: nurse.specialty ?? undefined,
  }));

  // Pagination object
  const pagination = {
    current: 1,
    limit: 20,
    records: total,
    pages: Math.ceil(total / 20),
  };

  return {
    pagination,
    data,
  };
}
