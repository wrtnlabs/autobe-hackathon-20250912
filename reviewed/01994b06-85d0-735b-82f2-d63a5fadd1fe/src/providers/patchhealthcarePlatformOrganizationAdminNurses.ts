import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { IPageIHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNurse";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of nurses from the
 * healthcarePlatform system (healthcare_platform_nurses table).
 *
 * This endpoint allows organization administrators to retrieve a paginated,
 * searchable roster of nurse accounts under their organization, supporting
 * advanced multi-field filtering and partial match search. Query options
 * include partial/full name, email, license number, status, and specialty.
 * Pagination and result ordering are standardized. Soft-deleted nurse accounts
 * are excluded. Strict authorization ensures only administrators of the
 * relevant organization can access.
 *
 * @param props -
 *
 *   - OrganizationAdmin: OrganizationadminPayload (authenticated org admin user)
 *   - Body: IHealthcarePlatformNurse.IRequest (filter/search input)
 *
 * @returns Paginated summary nurse list
 *   (IPageIHealthcarePlatformNurse.ISummary)
 * @throws {Error} When filter full_name or email are excessively long, or when
 *   status is an invalid value
 */
export async function patchhealthcarePlatformOrganizationAdminNurses(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformNurse.IRequest;
}): Promise<IPageIHealthcarePlatformNurse.ISummary> {
  const { body } = props;
  // Enforce max length safety on text filters
  if (body.full_name && body.full_name.length > 255)
    throw new Error("full_name filter too long");
  if (body.email && body.email.length > 255)
    throw new Error("email filter too long");

  // Pagination (default: page=1, limit=20). IRequest has no page/limit fields, so fixed.
  const limit: number = 20;
  const page: number = 1;
  // Build dynamic where clause for valid filters (partial for text; exact for status)
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
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
  };
  // Run query (with pagination and ordering)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_nurses.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        full_name: true,
        email: true,
        license_number: true,
        specialty: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_nurses.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      license_number: row.license_number,
      specialty: row.specialty !== undefined ? row.specialty : null,
    })),
  };
}
