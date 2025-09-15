import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new device data ingestion configuration in
 * healthcare_platform_device_data_ingestions.
 *
 * This endpoint allows organization admins to register a device data connector
 * for their organization, specifying the type, protocol, endpoint URI, and
 * operational status. Only admins assigned to the target organization are
 * permitted. Ingestion endpoint URIs must be unique within the org, and
 * duplicates are rejected. Creation action is transactionally safe and fully
 * auditable (to be extended).
 *
 * @param props - Input including organization admin authentication and request
 *   body
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   (must be assigned to org)
 * @param props.body - Device data ingestion configuration (org, device_type,
 *   URI, protocol, status)
 * @returns Device data ingestion configuration object with all assigned fields
 *   populated
 * @throws {Error} If admin is not assigned to org, uniqueness check fails, or
 *   DB error occurs
 */
export async function posthealthcarePlatformOrganizationAdminDeviceDataIngestions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDeviceDataIngestion.ICreate;
}): Promise<IHealthcarePlatformDeviceDataIngestion> {
  const { organizationAdmin, body } = props;

  // Ensure the authenticated org admin is assigned to this organization
  const isOrgAdmin =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
      },
    });
  if (!isOrgAdmin) {
    throw new Error(
      "Forbidden: You are not assigned as an admin to this organization.",
    );
  }

  // Device endpoint uniqueness per organization
  const exists =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        ingest_endpoint_uri: body.ingest_endpoint_uri,
      },
    });
  if (exists) {
    throw new Error(
      "Conflict: Ingest endpoint URI already exists for this organization.",
    );
  }

  // Prepare IDs and timestamps (never use Date type directly)
  const id = v4();
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.create({
      data: {
        id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        device_type: body.device_type,
        ingest_endpoint_uri: body.ingest_endpoint_uri,
        supported_protocol: body.supported_protocol,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    device_type: created.device_type,
    ingest_endpoint_uri: created.ingest_endpoint_uri,
    supported_protocol: created.supported_protocol,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    ...(created.deleted_at !== null && {
      deleted_at: toISOStringSafe(created.deleted_at),
    }),
  };
}
