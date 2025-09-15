import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete an insurance API integration configuration.
 *
 * This operation performs a hard (physical) deletion of an insurance API
 * integration from the healthcare_platform_insurance_api_integrations table. It
 * removes all traces of the integration for the specified organization. Only
 * system administrators may perform this operation, and all deletions are
 * recorded in the audit trail for compliance purposes.
 *
 * Prior to deletion, this handler verifies the existence of the integration
 * record. Upon deletion, an entry is created in the
 * healthcare_platform_audit_logs table with the relevant business and
 * compliance metadata.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated SystemadminPayload (must have type
 *   "systemAdmin")
 * @param props.insuranceApiIntegrationId - The UUID of the integration
 *   configuration to delete
 * @returns Void
 * @throws {Error} If the integration is not found or user lacks permission
 */
export async function deletehealthcarePlatformSystemAdminInsuranceApiIntegrationsInsuranceApiIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  insuranceApiIntegrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, insuranceApiIntegrationId } = props;
  // Authorization check (strict type)
  if (systemAdmin.type !== "systemAdmin") {
    throw new Error("Forbidden: Only system admins can perform this operation");
  }

  // Ensure the integration exists
  const integration =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
      {
        where: { id: insuranceApiIntegrationId },
      },
    );
  if (!integration) {
    throw new Error("Integration not found");
  }

  // Perform hard-deletion
  await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.delete({
    where: { id: insuranceApiIntegrationId },
  });

  // Log audit event for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: integration.healthcare_platform_organization_id,
      action_type: "INTEGRATION_DELETE",
      event_context: JSON.stringify({
        deleted_integration_id: insuranceApiIntegrationId,
      }),
      ip_address: null,
      related_entity_type: "insurance_api_integration",
      related_entity_id: insuranceApiIntegrationId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
