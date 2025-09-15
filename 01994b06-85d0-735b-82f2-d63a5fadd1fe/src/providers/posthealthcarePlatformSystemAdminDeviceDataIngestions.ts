import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new device data ingestion configuration in
 * healthcare_platform_device_data_ingestions.
 *
 * This operation creates a configuration record that allows the healthcare
 * platform to accept and process streaming or batch data from a registered
 * medical device for a given organization. Only system administrators may
 * perform this action. Business validations enforced: the organization must
 * exist (not soft-deleted), and the endpoint URI must be unique per
 * organization (not soft-deleted).
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload)
 * @param props.body - The device data ingestion configuration create request
 * @returns The full device data ingestion configuration as saved in the system
 *   (IHealthcarePlatformDeviceDataIngestion)
 * @throws {Error} When organization does not exist/is deleted or endpoint is
 *   not unique within organization
 */
export async function posthealthcarePlatformSystemAdminDeviceDataIngestions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDeviceDataIngestion.ICreate;
}): Promise<IHealthcarePlatformDeviceDataIngestion> {
  // Validate organization exists and is not soft-deleted
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: props.body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (!org)
    throw new Error(
      "Organization does not exist or has been deleted. Cannot create device data ingestion.",
    );

  // Enforce endpoint URI uniqueness within the organization (not soft-deleted)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: {
        healthcare_platform_organization_id:
          props.body.healthcare_platform_organization_id,
        ingest_endpoint_uri: props.body.ingest_endpoint_uri,
        deleted_at: null,
      },
    });
  if (duplicate)
    throw new Error(
      "A device data ingestion endpoint with this URI already exists for this organization.",
    );

  // Prepare timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the device data ingestion configuration
  const created =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.create({
      data: {
        id: v4(),
        healthcare_platform_organization_id:
          props.body.healthcare_platform_organization_id,
        device_type: props.body.device_type,
        ingest_endpoint_uri: props.body.ingest_endpoint_uri,
        supported_protocol: props.body.supported_protocol,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        // deleted_at is omitted on creation
      },
    });

  // Return with correct branding and null/undefined for deleted_at as per API
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
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
