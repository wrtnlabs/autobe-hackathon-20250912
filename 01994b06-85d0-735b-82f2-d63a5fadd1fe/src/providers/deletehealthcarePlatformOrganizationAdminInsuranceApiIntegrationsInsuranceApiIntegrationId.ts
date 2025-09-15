import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete an insurance API integration configuration.
 *
 * This operation removes the specified insurance API integration (hard delete)
 * for the given organization. Only organization admins may perform this
 * operation, and only on integrations owned by their organization. The delete
 * is logged in the audit trail for compliance and regulatory purposes.
 *
 * - Ensures the admin is actively assigned to the organization (not deleted,
 *   suspended, or unlinked).
 * - Validates the integration belongs to the admin's organization; forbids
 *   cross-org deletes.
 * - Throws error if integration does not exist or if unauthorized.
 * - Deletes the integration record without soft-delete recovery.
 * - Appends an audit log row with timestamp and full event context.
 *
 * @param props Includes the authenticated organization admin and integration
 *   id.
 * @param props.organizationAdmin The authenticated OrganizationadminPayload
 *   performing the operation.
 * @param props.insuranceApiIntegrationId Target insurance API integration
 *   record id (uuid string).
 * @returns Void
 * @throws {Error} If admin/assignment not found, integration not found, or not
 *   authorized.
 */
export async function deletehealthcarePlatformOrganizationAdminInsuranceApiIntegrationsInsuranceApiIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceApiIntegrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, insuranceApiIntegrationId } = props;

  // Validate admin presence and not deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (!admin) {
    throw new Error("Organization admin not found or deleted");
  }

  // Retrieve the organization assignment (active only)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: admin.id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error("Active organization assignment not found for this admin");
  }

  // Find the insurance API integration record
  const integration =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
      {
        where: { id: insuranceApiIntegrationId },
      },
    );
  if (!integration) {
    throw new Error("Insurance API integration not found");
  }

  // Make sure the record belongs to the org that the admin manages
  if (
    integration.healthcare_platform_organization_id !==
    assignment.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Forbidden: This integration does not belong to your organization",
    );
  }

  // Hard-delete the integration
  await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.delete({
    where: { id: insuranceApiIntegrationId },
  });

  // Write audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: admin.id,
      organization_id: assignment.healthcare_platform_organization_id,
      action_type: "INSURANCE_API_INTEGRATION_DELETE",
      related_entity_type: "INSURANCE_API_INTEGRATION",
      related_entity_id: integration.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
