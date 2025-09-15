import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a pharmacy integration by ID
 * (healthcare_platform_pharmacy_integrations)
 *
 * Updates the configuration details for a specific pharmacy integration record,
 * as identified by pharmacyIntegrationId. This allows system admins to change
 * the endpoint URI, protocol, status, or vendor code for an existing pharmacy
 * network connector associated with an organization.
 *
 * The function enforces business rules: it forbids updates to soft-deleted
 * integrations (deleted_at != null) and prevents activating multiple active
 * connectors with the same vendor code within the same organization. If such a
 * conflict would occur, or if the integration does not exist or is deleted, it
 * throws an error. Audit requirements and compliance notifications are assumed
 * to be triggered outside this provider. Only mutable fields are updated; core
 * identifiers and timestamps (created_at) are preserved. All date times are
 * handled as string & tags.Format<'date-time'>.
 *
 * @param props - Object containing parameters for the update operation
 * @param props.systemAdmin - Authenticated system admin (authorization must be
 *   enforced in route/decorator)
 * @param props.pharmacyIntegrationId - UUID of the pharmacy integration record
 *   to update
 * @param props.body - Update payload with new values for connection_uri,
 *   status, supported_protocol, or pharmacy_vendor_code
 * @returns The updated pharmacy integration configuration object
 * @throws {Error} If the integration does not exist, is soft-deleted, or would
 *   violate uniqueness constraints for active vendor/organization
 */
export async function puthealthcarePlatformSystemAdminPharmacyIntegrationsPharmacyIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  pharmacyIntegrationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPharmacyIntegration.IUpdate;
}): Promise<IHealthcarePlatformPharmacyIntegration> {
  const { pharmacyIntegrationId, body } = props;
  // Fetch the integration record and validate existence/non-deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findUnique({
      where: { id: pharmacyIntegrationId },
    });
  if (!integration || integration.deleted_at !== null) {
    throw new Error("Pharmacy integration not found or has been deleted");
  }

  // If status is being set to 'active', check business uniqueness constraint
  const nextVendorCode =
    body.pharmacy_vendor_code !== undefined
      ? body.pharmacy_vendor_code
      : integration.pharmacy_vendor_code;
  const nextStatus =
    body.status !== undefined ? body.status : integration.status;
  if (nextStatus === "active") {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst(
        {
          where: {
            id: { not: pharmacyIntegrationId },
            healthcare_platform_organization_id:
              integration.healthcare_platform_organization_id,
            pharmacy_vendor_code: nextVendorCode,
            status: "active",
            deleted_at: null,
          },
        },
      );
    if (duplicate) {
      throw new Error(
        "Cannot activate: another active pharmacy integration exists for this vendor and organization",
      );
    }
  }

  // Perform the update (only updatable fields; preserve others)
  const updated =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.update({
      where: { id: pharmacyIntegrationId },
      data: {
        connection_uri:
          body.connection_uri !== undefined ? body.connection_uri : undefined,
        supported_protocol:
          body.supported_protocol !== undefined
            ? body.supported_protocol
            : undefined,
        status: body.status !== undefined ? body.status : undefined,
        pharmacy_vendor_code:
          body.pharmacy_vendor_code !== undefined
            ? body.pharmacy_vendor_code
            : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return result using correct typing and date formatting
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    pharmacy_vendor_code: updated.pharmacy_vendor_code,
    connection_uri: updated.connection_uri,
    supported_protocol: updated.supported_protocol,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
