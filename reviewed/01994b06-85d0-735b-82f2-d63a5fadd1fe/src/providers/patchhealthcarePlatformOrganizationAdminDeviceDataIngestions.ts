import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { IPageIHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDeviceDataIngestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List device data ingestion integrations with paging and filtering
 *
 * Retrieves a paginated, filtered list of medical device data ingestion
 * connector records, scoped to the authenticated organization admin's assigned
 * organization. Only permits the admin to view records from their own
 * organization, ignoring any attempted filter for a different organization id.
 * Supports advanced querying, sorting, and pagination using system-wide
 * conventions; strictly excludes soft-deleted rows.
 *
 * @param props - Object containing OrganizationadminPayload (authenticated
 *   admin) and IRequest (filters, paging, sorting)
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Search/filter, paging, and sorting parameters
 *   (IHealthcarePlatformDeviceDataIngestion.IRequest)
 * @returns IPageIHealthcarePlatformDeviceDataIngestion response: results and
 *   pagination info
 * @throws {Error} If admin does not have an active assignment to an
 *   organization
 */
export async function patchhealthcarePlatformOrganizationAdminDeviceDataIngestions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDeviceDataIngestion.IRequest;
}): Promise<IPageIHealthcarePlatformDeviceDataIngestion> {
  const { organizationAdmin, body } = props;
  // Get org admin's assigned organization (enforced by DB join)
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findUniqueOrThrow(
      {
        where: { id: organizationAdmin.id, deleted_at: null },
        select: { id: true },
      },
    );
  const userOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: orgAdmin.id, deleted_at: null },
      select: { healthcare_platform_organization_id: true },
    });
  if (!userOrgAssignment)
    throw new Error("Organization assignment not found for admin");
  const organizationId = userOrgAssignment.healthcare_platform_organization_id;
  // Parse pagination (defaults; clamp to minimums)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const page_size =
    typeof body.page_size === "number" && body.page_size > 0
      ? body.page_size
      : 20;
  const skip = (page - 1) * page_size;
  // Allowed fields for user-controllable sorting
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "status",
    "device_type",
    "supported_protocol",
    "id",
  ];
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (typeof body.sort === "string" && body.sort.trim().length > 0) {
    const [field, sortDirection] = body.sort.trim().split(/\s+/);
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: sortDirection === "asc" ? "asc" : "desc" };
    }
  }
  // Build where clause strictly on admin's org and non-deleted
  const where = {
    healthcare_platform_organization_id: organizationId,
    deleted_at: null,
    ...(body.device_type ? { device_type: body.device_type } : {}),
    ...(body.supported_protocol
      ? { supported_protocol: body.supported_protocol }
      : {}),
    ...(body.status ? { status: body.status } : {}),
  };
  // Retrieve data and total count simultaneously
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_device_data_ingestions.findMany({
      where,
      orderBy,
      skip,
      take: page_size,
    }),
    MyGlobal.prisma.healthcare_platform_device_data_ingestions.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: rows.map((row) => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      device_type: row.device_type,
      ingest_endpoint_uri: row.ingest_endpoint_uri,
      supported_protocol: row.supported_protocol,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
