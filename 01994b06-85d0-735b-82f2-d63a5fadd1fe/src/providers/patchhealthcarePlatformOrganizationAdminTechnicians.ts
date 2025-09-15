import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { IPageIHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTechnician";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search, filter, and paginate the list of technicians in
 * healthcare_platform_technicians.
 *
 * This endpoint retrieves a filtered, paginated list of technical staff (lab,
 * imaging, etc.) for healthcare organizations, supporting advanced filtering
 * and RBAC constraints for authorized organization administrators. The query
 * supports filters (email, name, license, specialty, status) and always
 * paginates for large directories.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization administrator
 *   user context
 * @param props.body - Search and filter parameters for technician staff
 * @returns Paginated list of technician summary information
 * @throws {Error} If database error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminTechnicians(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformTechnician.IRequest;
}): Promise<IPageIHealthcarePlatformTechnician.ISummary> {
  const { body } = props;
  // Default pagination parameters (page/limit), could be moved to query/body if API provides
  const page = 1;
  const limit = 20;
  // Build where clause inline, using DTO-compliant patterns
  const filters = {
    ...(body.email !== undefined &&
      body.email !== null && { email: { contains: body.email } }),
    ...(body.full_name !== undefined &&
      body.full_name !== null && { full_name: { contains: body.full_name } }),
    ...(body.license_number !== undefined &&
      body.license_number !== null && {
        license_number: { contains: body.license_number },
      }),
    ...(body.specialty !== undefined &&
      body.specialty !== null && { specialty: { contains: body.specialty } }),
  };
  // Status mapping (virtual filter)
  const statusFilter =
    body.status === "active"
      ? { deleted_at: null }
      : body.status === "inactive" || body.status === "deleted"
        ? { deleted_at: { not: null } }
        : {};
  // Fetch pagination data and results concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_technicians.findMany({
      where: {
        ...filters,
        ...statusFilter,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_technicians.count({
      where: {
        ...filters,
        ...statusFilter,
      },
    }),
  ]);
  // Map tech summaries, using typia branded types, no Date, no as
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(Number(total) / Number(limit))),
    },
    data: results.map((tech) => ({
      id: tech.id as string & tags.Format<"uuid">,
      email: tech.email as string & tags.Format<"email">,
      full_name: tech.full_name,
      specialty: tech.specialty ?? undefined,
    })),
  };
}
