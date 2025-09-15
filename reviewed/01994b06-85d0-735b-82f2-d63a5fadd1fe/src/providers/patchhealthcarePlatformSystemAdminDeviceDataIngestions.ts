import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { IPageIHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDeviceDataIngestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List device data ingestion integrations with paging and filtering
 *
 * Retrieves a paginated, filtered list of device data ingestion records for
 * organizations. Allows advanced searching by organization, device type,
 * protocol, and status. Results are sorted and paginated, omitting soft-deleted
 * rows. System administrator authentication is required.
 *
 * @param props - Contains the authenticated SystemadminPayload and request body
 * @returns Paginated, searchable page of device data ingestion configurations
 * @throws {Error} If there is a database or unexpected error
 */
export async function patchhealthcarePlatformSystemAdminDeviceDataIngestions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDeviceDataIngestion.IRequest;
}): Promise<IPageIHealthcarePlatformDeviceDataIngestion> {
  const { body } = props;

  // Filtering conditions: build where based on provided filters (null/undefined skipped)
  const where = {
    deleted_at: null,
    ...(body.healthcare_platform_organization_id !== undefined &&
      body.healthcare_platform_organization_id !== null && {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
      }),
    ...(body.device_type !== undefined &&
      body.device_type !== null && {
        device_type: body.device_type,
      }),
    ...(body.supported_protocol !== undefined &&
      body.supported_protocol !== null && {
        supported_protocol: body.supported_protocol,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
  };

  // Parse and validate sort (field [asc|desc])
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  const allowedSortFields = [
    "id",
    "healthcare_platform_organization_id",
    "device_type",
    "supported_protocol",
    "status",
    "created_at",
    "updated_at",
  ];
  if (typeof body.sort === "string" && body.sort.trim().length > 0) {
    const [sortField, sortDir] = body.sort.trim().split(" ");
    if (
      allowedSortFields.includes(sortField) &&
      (sortDir === "asc" || sortDir === "desc")
    ) {
      orderBy = { [sortField]: sortDir };
    }
  }

  // Pagination
  const page =
    typeof body.page === "number" && body.page > 0 ? Number(body.page) : 1;
  const limit =
    typeof body.page_size === "number" && body.page_size > 0
      ? Number(body.page_size)
      : 10;
  const skip = (page - 1) * limit;

  // Query: findMany for rows, count for total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_device_data_ingestions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_device_data_ingestions.count({ where }),
  ]);

  // Map to DTO (convert all dates to ISO8601 strings, deleted_at as undefined if null)
  const data = rows.map((row) => ({
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
  }));

  // Pagination struct - strip tags as needed for type matching
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
