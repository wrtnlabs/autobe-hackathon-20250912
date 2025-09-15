import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve details for a single insurance API integration
 * (healthcare_platform_insurance_api_integrations)
 *
 * This operation returns the configuration and audit metadata for a specific
 * insurance API integration entity. It strictly enforces organization
 * boundaries and soft-deletion logic (records with non-null `deleted_at` are
 * not accessible). Only organization admins of the associated organization may
 * access this data.
 *
 * @param props - Operation properties
 * @param props.organizationAdmin - Organization administrator authentication
 *   payload (must match integration's org)
 * @param props.insuranceApiIntegrationId - ID of the insurance API integration
 *   to retrieve
 * @returns Full integration configuration and audit/accountability metadata
 * @throws {Error} If the integration does not exist, is deleted, or
 *   organization admin does not have access rights
 */
export async function gethealthcarePlatformOrganizationAdminInsuranceApiIntegrationsInsuranceApiIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceApiIntegrationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsuranceApiIntegration> {
  const { organizationAdmin, insuranceApiIntegrationId } = props;
  // Lookup must strictly enforce org match and soft-delete logic
  const integration =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
      {
        where: {
          id: insuranceApiIntegrationId,
          deleted_at: null,
          healthcare_platform_organization_id: organizationAdmin.id,
        },
      },
    );
  if (!integration) {
    throw new Error("Integration not found or access denied");
  }
  return {
    id: integration.id,
    healthcare_platform_organization_id:
      integration.healthcare_platform_organization_id,
    insurance_vendor_code: integration.insurance_vendor_code,
    connection_uri: integration.connection_uri,
    supported_transaction_types: integration.supported_transaction_types,
    status: integration.status,
    created_at: toISOStringSafe(integration.created_at),
    updated_at: toISOStringSafe(integration.updated_at),
    ...(integration.deleted_at !== null && {
      deleted_at: toISOStringSafe(integration.deleted_at),
    }),
  };
}
