import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a specific organization's laboratory integration configuration
 * (healthcare_platform_lab_integrations table).
 *
 * This operation updates an existing laboratory integration configuration. Only
 * organization administrators can update integration settings. It supports
 * updating connection URI, provider code, supported message format, and status
 * fields. Uniqueness for lab_vendor_code is enforced within the organization.
 * Only active (non-deleted) integration records can be updated. The integration
 * record's updated_at value will be refreshed. Business rules ensure RBAC and
 * uniqueness within the tenancy boundary. Attempts to update non-existent or
 * deleted records, or without privilege, result in an error.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the operation (must own the integration)
 * @param props.labIntegrationId - UUID of the laboratory integration to update
 * @param props.body - Request body containing updated configuration fields
 * @returns The full updated integration configuration with all fields populated
 * @throws {Error} If the integration does not exist, has been deleted, admin is
 *   unauthorized, or lab_vendor_code is not unique
 */
export async function puthealthcarePlatformOrganizationAdminLabIntegrationsLabIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  labIntegrationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabIntegration.IUpdate;
}): Promise<IHealthcarePlatformLabIntegration> {
  const { organizationAdmin, labIntegrationId, body } = props;

  // 1. Fetch integration to update, ensure not deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
      where: {
        id: labIntegrationId,
        deleted_at: null,
      },
    });
  if (!integration) {
    throw new Error("Lab integration not found or already deleted");
  }
  // 2. Organization admin may only update integrations owned by their organization
  if (
    integration.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: You may only update integrations for your organization",
    );
  }

  // 3. If lab_vendor_code is being updated and changed, enforce uniqueness within organization
  if (
    typeof body.lab_vendor_code !== "undefined" &&
    body.lab_vendor_code !== integration.lab_vendor_code
  ) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
        where: {
          healthcare_platform_organization_id:
            integration.healthcare_platform_organization_id,
          lab_vendor_code: body.lab_vendor_code,
          deleted_at: null,
          NOT: { id: labIntegrationId },
        },
      });
    if (duplicate) {
      throw new Error("lab_vendor_code must be unique within the organization");
    }
  }

  // 4. Update only provided fields, plus timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.update({
      where: { id: labIntegrationId },
      data: {
        ...(typeof body.lab_vendor_code !== "undefined" && {
          lab_vendor_code: body.lab_vendor_code,
        }),
        ...(typeof body.connection_uri !== "undefined" && {
          connection_uri: body.connection_uri,
        }),
        ...(typeof body.supported_message_format !== "undefined" && {
          supported_message_format: body.supported_message_format,
        }),
        ...(typeof body.status !== "undefined" && { status: body.status }),
        ...(typeof body.healthcare_platform_organization_id !== "undefined" && {
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
        }),
        updated_at: now,
      },
    });

  // 5. Return with required type conversions
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    lab_vendor_code: updated.lab_vendor_code,
    connection_uri: updated.connection_uri,
    supported_message_format: updated.supported_message_format,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
