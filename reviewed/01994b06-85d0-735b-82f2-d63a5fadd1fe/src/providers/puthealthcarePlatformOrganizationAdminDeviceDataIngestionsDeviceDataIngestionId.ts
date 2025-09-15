import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing device data ingestion configuration by ID.
 *
 * This operation enables organization administrators to update the endpoint,
 * device type, protocol, status, or soft deletion status of a device data
 * ingestion configuration in the healthcare platform. The update is only
 * permitted for admins assigned to the owning organization, and endpoint URIs
 * must remain unique within each organization. All changes are audited via
 * updated_at field. Returns the updated configuration.
 *
 * @param props - Properties for the update operation
 * @param props.organizationAdmin - Authenticated org admin (JWT payload)
 * @param props.deviceDataIngestionId - UUID of the device ingestion
 *   configuration to modify
 * @param props.body - Update fields (any or all of ingest_endpoint_uri,
 *   device_type, supported_protocol, status, deleted_at)
 * @returns The updated device ingestion configuration record
 * @throws {Error} When record not found, soft deleted, unauthorized, or
 *   endpoint URI would duplicate
 */
export async function puthealthcarePlatformOrganizationAdminDeviceDataIngestionsDeviceDataIngestionId(props: {
  organizationAdmin: OrganizationadminPayload;
  deviceDataIngestionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDeviceDataIngestion.IUpdate;
}): Promise<IHealthcarePlatformDeviceDataIngestion> {
  const { organizationAdmin, deviceDataIngestionId, body } = props;

  // Fetch device ingestion record (must exist and not be deleted)
  const record =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst({
      where: {
        id: deviceDataIngestionId,
        deleted_at: null,
      },
    });
  if (!record)
    throw new Error("Device data ingestion configuration not found or deleted");

  // Confirm org admin is assigned to this org (active assignment)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          record.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!assignment)
    throw new Error("You are not authorized for this organization");

  // Check uniqueness for endpoint URI within org if being changed
  if (body.ingest_endpoint_uri !== undefined) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_device_data_ingestions.findFirst(
        {
          where: {
            healthcare_platform_organization_id:
              record.healthcare_platform_organization_id,
            ingest_endpoint_uri: body.ingest_endpoint_uri,
            deleted_at: null,
            id: { not: deviceDataIngestionId },
          },
        },
      );
    if (duplicate)
      throw new Error("Duplicate endpoint URI within organization");
  }

  // Compute new updated_at (always audited)
  const now = toISOStringSafe(new Date());

  // Only update provided fields, do not touch id/org_id/created_at
  const updateFields = {
    updated_at: now,
    ...(body.device_type !== undefined && { device_type: body.device_type }),
    ...(body.ingest_endpoint_uri !== undefined && {
      ingest_endpoint_uri: body.ingest_endpoint_uri,
    }),
    ...(body.supported_protocol !== undefined && {
      supported_protocol: body.supported_protocol,
    }),
    ...(body.status !== undefined && { status: body.status }),
    // For deleted_at: can be set to ISO string for soft delete, or null (to reactivate)
    ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_device_data_ingestions.update({
      where: { id: deviceDataIngestionId },
      data: updateFields,
    });

  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    device_type: updated.device_type,
    ingest_endpoint_uri: updated.ingest_endpoint_uri,
    supported_protocol: updated.supported_protocol,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // deleted_at is optional/nullable in DTO; present as null or ISO string or omitted when undefined
    ...(updated.deleted_at !== null && updated.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(updated.deleted_at) }
      : updated.deleted_at === null
        ? { deleted_at: null }
        : {}),
  };
}
