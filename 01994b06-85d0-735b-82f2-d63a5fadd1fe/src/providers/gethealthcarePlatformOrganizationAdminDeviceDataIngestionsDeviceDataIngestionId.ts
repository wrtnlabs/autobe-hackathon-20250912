import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific device data ingestion configuration by ID from
 * healthcare_platform_device_data_ingestions table.
 *
 * This operation fetches detailed information about a device data ingestion
 * integration for a specific organization. Access is restricted to organization
 * administrators who are assigned and active for the ingestion's organization,
 * ensuring compliance and secured RBAC boundaries for device data integrations.
 * The result includes all configuration, protocol, endpoint, and operational
 * status details in a domain-compliant data structure.
 *
 * @param props - Parameters for this operation
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload
 * @param props.deviceDataIngestionId - UUID of the device data ingestion record
 *   to retrieve
 * @returns The full device data ingestion record, mapped to API DTO structure
 * @throws {Error} If the device data ingestion does not exist, is soft-deleted,
 *   or is not accessible to the admin
 */
export async function gethealthcarePlatformOrganizationAdminDeviceDataIngestionsDeviceDataIngestionId(props: {
  organizationAdmin: OrganizationadminPayload;
  deviceDataIngestionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDeviceDataIngestion> {
  const { organizationAdmin, deviceDataIngestionId } = props;
  // Fetch the device ingestion record, only if not soft deleted
  const ingestion =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: {
        id: deviceDataIngestionId,
        deleted_at: null,
      },
    });
  if (!ingestion) throw new Error("Device data ingestion not found");
  // RBAC: Check that the admin is assigned to the organization owning this ingestion (active assignment, not soft-deleted)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          ingestion.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!assignment)
    throw new Error("Forbidden: cannot access this device data ingestion");
  // Map result, strictly converting all date fields
  return {
    id: ingestion.id,
    healthcare_platform_organization_id:
      ingestion.healthcare_platform_organization_id,
    device_type: ingestion.device_type,
    ingest_endpoint_uri: ingestion.ingest_endpoint_uri,
    supported_protocol: ingestion.supported_protocol,
    status: ingestion.status,
    created_at: toISOStringSafe(ingestion.created_at),
    updated_at: toISOStringSafe(ingestion.updated_at),
    deleted_at:
      ingestion.deleted_at == null
        ? undefined
        : toISOStringSafe(ingestion.deleted_at),
  };
}
