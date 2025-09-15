import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details for a single insurance API integration
 * (healthcare_platform_insurance_api_integrations)
 *
 * This operation retrieves a single insurance API integration configuration
 * from the healthcare_platform_insurance_api_integrations table using its
 * unique integration ID. The returned record contains all configuration,
 * connection, and audit metadata for the insurance API integration, including
 * payer/vendor code, endpoint URI, supported transaction types, current status,
 * and history. This endpoint is essential for monitoring payer connectivity,
 * troubleshooting configuration or status issues, and supporting compliance
 * audit workflows. It is strictly read-only: insurance API integration
 * configuration can only be updated through back-office or system-managed
 * processes, not via this API.
 *
 * Authorization: Only available to authenticated system administrators
 * (SystemadminPayload). General users are not permitted to access this endpoint
 * as returned configuration may include sensitive information relevant to
 * system integrations and compliance settings.
 *
 * @param props - Operation properties
 * @param props.systemAdmin - The authenticated system admin retrieving this
 *   record (payload)
 * @param props.insuranceApiIntegrationId - UUID of the insurance API
 *   integration record to retrieve
 * @returns Full detail for the specified insurance API integration including
 *   all configuration fields and audit metadata
 * @throws {Error} If no record is found with the specified id, or if the
 *   authenticated user is not a valid system admin
 */
export async function gethealthcarePlatformSystemAdminInsuranceApiIntegrationsInsuranceApiIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  insuranceApiIntegrationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsuranceApiIntegration> {
  if (props.systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized");
  }
  const record =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findUniqueOrThrow(
      {
        where: { id: props.insuranceApiIntegrationId },
      },
    );
  return {
    id: record.id,
    healthcare_platform_organization_id:
      record.healthcare_platform_organization_id,
    insurance_vendor_code: record.insurance_vendor_code,
    connection_uri: record.connection_uri,
    supported_transaction_types: record.supported_transaction_types,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? null
        : toISOStringSafe(record.deleted_at),
  };
}
