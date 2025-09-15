import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { IPageIHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTechnician";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search, filter, and paginate the list of technicians in
 * healthcare_platform_technicians.
 *
 * This endpoint allows system administrators to search and page through the
 * technician directory, supporting filters on name, email, license number,
 * specialty, and derived status (active/deleted) with robust pagination.
 *
 * Only users authenticated as systemAdmin may invoke this operation. All
 * results are sourced strictly from the technician table using validated
 * filters. Returned values are mapped strictly to summary DTOs, omitting any
 * sensitive or excessive detail.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated SystemadminPayload for this API
 *   invocation
 * @param props.body - IHealthcarePlatformTechnician.IRequest object containing
 *   filter and search options
 * @returns Paginated set of summary technician DTOs per
 *   IPageIHealthcarePlatformTechnician.ISummary specification
 * @throws {Error} If the systemAdmin payload is missing, invalid, or if query
 *   execution fails
 */
export async function patchhealthcarePlatformSystemAdminTechnicians(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformTechnician.IRequest;
}): Promise<IPageIHealthcarePlatformTechnician.ISummary> {
  const { systemAdmin, body } = props;

  // Role enforcement is guaranteed at controller/decorator layer
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized: systemAdmin role required.");
  }

  // Extract pagination with safe defaults
  let page = 1;
  let limit = 20;
  if (typeof (body as any).page === "number" && (body as any).page > 0) {
    page = (body as any).page;
  }
  if (typeof (body as any).limit === "number" && (body as any).limit > 0) {
    limit = (body as any).limit;
  }
  const skip = (page - 1) * limit;

  // Compose DB filter for all allowed fields
  const where = {
    ...(typeof body.email === "string" &&
      body.email.length > 0 && {
        email: { contains: body.email },
      }),
    ...(typeof body.full_name === "string" &&
      body.full_name.length > 0 && {
        full_name: { contains: body.full_name },
      }),
    ...(typeof body.license_number === "string" &&
      body.license_number.length > 0 && {
        license_number: { contains: body.license_number },
      }),
    ...(typeof body.specialty === "string" &&
      body.specialty.length > 0 && {
        specialty: { contains: body.specialty },
      }),
    ...(typeof body.status === "string" &&
      body.status.length > 0 &&
      body.status === "active" && {
        deleted_at: null,
      }),
    ...(typeof body.status === "string" &&
      body.status.length > 0 &&
      body.status === "deleted" && {
        deleted_at: { not: null },
      }),
  };

  // Query DB (never use intermediate variables for Prisma ops)
  const [rows, totalRecords] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_technicians.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, email: true, full_name: true, specialty: true },
    }),
    MyGlobal.prisma.healthcare_platform_technicians.count({ where }),
  ]);

  // Map raw DB results to ISummary array with strict null/undefined logic for specialty
  const data: IHealthcarePlatformTechnician.ISummary[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    // specialty?: string | null | undefined;
    specialty: row.specialty ?? undefined,
  }));

  const pages = limit > 0 ? Math.ceil(totalRecords / limit) : 1;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages: pages,
    },
    data: data,
  };
}
