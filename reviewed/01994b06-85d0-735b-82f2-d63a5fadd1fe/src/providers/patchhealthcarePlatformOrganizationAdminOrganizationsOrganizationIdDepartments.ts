import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import { IPageIHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDepartment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves a paginated, filtered list of departments for a specified
 * organization (organizationId) from healthcare_platform_departments.
 *
 * This endpoint is used by authenticated organization admins to fetch a
 * filtered, paginated list of their organization's departments. The operation
 * ensures that only organization admins may access data for their own active
 * (not soft-deleted) organizations. Supports fuzzy name search, exact
 * code/status filtering, and created_at range and pagination controls.
 *
 * @property organizationAdmin - Authenticated admin user
 *   (OrganizationadminPayload)
 * @property organizationId - UUID of the organization being queried
 * @property body - Filter, search, and pagination parameters
 *   (IHealthcarePlatformDepartment.IRequest)
 * @param props - Object parameter
 * @returns Paginated summary list of departments, with pagination metadata
 * @throws {Error} If the specified organization is missing or soft-deleted
 */
export async function patchhealthcarePlatformOrganizationAdminOrganizationsOrganizationIdDepartments(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDepartment.IRequest;
}): Promise<IPageIHealthcarePlatformDepartment.ISummary> {
  const { organizationAdmin, organizationId, body } = props;

  // 1. Confirm the organization exists and is not soft-deleted
  const orgExists =
    await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
      where: {
        id: organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!orgExists) {
    throw new Error("Organization not found or is soft-deleted");
  }

  // 2. Pagination logic: default page=0, limit=20
  const page = typeof body.page === "number" ? body.page : 0;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const skip = page * limit;

  // 3. Build where filter object (strict schema fields only)
  const filters: Record<string, unknown> = {
    healthcare_platform_organization_id: organizationId,
    deleted_at: null,
  };
  if (body.code !== undefined && body.code !== null) {
    filters.code = body.code;
  }
  if (body.name !== undefined && body.name !== null) {
    filters.name = { contains: body.name };
  }
  if (body.status !== undefined && body.status !== null) {
    filters.status = body.status;
  }
  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    filters.created_at = {
      ...(body.created_at_from !== undefined &&
        body.created_at_from !== null && { gte: body.created_at_from }),
      ...(body.created_at_to !== undefined &&
        body.created_at_to !== null && { lte: body.created_at_to }),
    };
  }

  // 4. Query paged data and total simultaneously
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_departments.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        code: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_departments.count({ where: filters }),
  ]);

  // 5. Cleanly map to DTO, converting dates properly (toISOStringSafe)
  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      code: row.code,
      name: row.name,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
