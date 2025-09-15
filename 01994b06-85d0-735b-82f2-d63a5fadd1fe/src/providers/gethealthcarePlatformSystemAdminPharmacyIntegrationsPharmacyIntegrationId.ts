import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get configuration details for a specific pharmacy integration by ID
 * (healthcare_platform_pharmacy_integrations)
 *
 * This function retrieves all configuration and linkage metadata for a pharmacy
 * integration connector by its unique ID. It is used by system administrators
 * to view the status, vendor, URI, and protocol for any integration registered
 * on the platform. Access is limited to system admins (payload must be present
 * in props), and only non-deleted (active) integrations are shown. Throws an
 * error if no active integration with the specified ID exists.
 *
 * @param props - Parameters for request
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.pharmacyIntegrationId - UUID identifying the pharmacy
 *   integration record
 * @returns Configuration and status details for the pharmacy integration
 * @throws {Error} If no active integration with specified ID exists
 */
export async function gethealthcarePlatformSystemAdminPharmacyIntegrationsPharmacyIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  pharmacyIntegrationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPharmacyIntegration> {
  // Authorization already enforced via props.systemAdmin
  const integration =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        id: props.pharmacyIntegrationId,
        deleted_at: null,
      },
    });
  if (!integration) {
    throw new Error("Pharmacy integration not found");
  }
  return {
    id: integration.id,
    healthcare_platform_organization_id:
      integration.healthcare_platform_organization_id,
    pharmacy_vendor_code: integration.pharmacy_vendor_code,
    connection_uri: integration.connection_uri,
    supported_protocol: integration.supported_protocol,
    status: integration.status,
    created_at: toISOStringSafe(integration.created_at),
    updated_at: toISOStringSafe(integration.updated_at),
    deleted_at:
      integration.deleted_at == null
        ? undefined
        : toISOStringSafe(integration.deleted_at),
  };
}
