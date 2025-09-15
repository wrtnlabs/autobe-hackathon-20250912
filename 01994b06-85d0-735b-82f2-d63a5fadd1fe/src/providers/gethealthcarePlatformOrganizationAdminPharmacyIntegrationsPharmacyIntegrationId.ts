import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get configuration details for a specific pharmacy integration by ID
 * (healthcare_platform_pharmacy_integrations)
 *
 * Retrieves all metadata, status, and linkage for a pharmacy integration
 * connector, identified by pharmacyIntegrationId. Only organization admins with
 * access to the owning organization may fetch the details (strict org
 * isolation). Throws a 404 error if not found or soft deleted. Throws a
 * forbidden error if the admin attempts cross-org access.
 *
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload for
 *   permission validation and org isolation.
 * @param props.pharmacyIntegrationId - UUID of the pharmacy integration record
 *   to retrieve.
 * @returns IHealthcarePlatformPharmacyIntegration object with all connector
 *   configuration details.
 * @throws {Error} When not found, soft deleted, or if organization isolation
 *   fails.
 */
export async function gethealthcarePlatformOrganizationAdminPharmacyIntegrationsPharmacyIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  pharmacyIntegrationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPharmacyIntegration> {
  const { organizationAdmin, pharmacyIntegrationId } = props;

  // Query integration (must not be soft deleted)
  const integration =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        id: pharmacyIntegrationId,
        deleted_at: null,
      },
    });
  if (!integration) {
    throw new Error("Pharmacy integration not found");
  }

  // Org isolation check: ensure admin belongs to integration's org
  // OrganizationadminPayload does not natively have org id; needs to be inferred/extended
  // If not available in payload, throw forbidden (cannot resolve linkage)
  // Assume property is 'organization_id' on OrganizationadminPayload (if not present, hard error)
  if (!("organization_id" in organizationAdmin)) {
    throw new Error("Organization information missing from admin payload");
  }
  const adminOrgId = (
    organizationAdmin as { organization_id: string & tags.Format<"uuid"> }
  ).organization_id;
  if (integration.healthcare_platform_organization_id !== adminOrgId) {
    throw new Error(
      "Access denied: organization admin does not have access to this pharmacy integration",
    );
  }

  // Produce output with correct types/branding for all date fields
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
    deleted_at: integration.deleted_at
      ? toISOStringSafe(integration.deleted_at)
      : undefined,
  };
}
