import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update configuration of an existing insurance API integration
 *
 * Updates an existing insurance API integration configuration record for an
 * organization, allowing changes to vendor code, connection URI, supported
 * transaction types, or operational status. Strictly enforces
 * organization+vendor_code uniqueness, prevents connection URI duplication
 * within the organization, and requires the integration to be active (not
 * soft-deleted). Only accessible by system administrators.
 *
 * @param props - Parameters for the operation
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.insuranceApiIntegrationId - Unique identifier of the insurance
 *   API integration to update
 * @param props.body - Updated configuration data for the insurance API
 *   integration
 * @returns The updated insurance API integration configuration object (with all
 *   date fields as ISO string)
 * @throws {Error} If the integration is not found, has been deleted, or
 *   violates uniqueness constraints
 */
export async function puthealthcarePlatformSystemAdminInsuranceApiIntegrationsInsuranceApiIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  insuranceApiIntegrationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceApiIntegration.IUpdate;
}): Promise<IHealthcarePlatformInsuranceApiIntegration> {
  // Fetch integration: must exist and must not be soft-deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
      {
        where: {
          id: props.insuranceApiIntegrationId,
          deleted_at: null,
        },
      },
    );
  if (!integration)
    throw new Error("Insurance API integration not found or has been deleted");

  // If connection_uri is being updated, ensure no duplicate URI (active, same org, not self)
  if (props.body.connection_uri !== undefined) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
        {
          where: {
            connection_uri: props.body.connection_uri,
            healthcare_platform_organization_id:
              integration.healthcare_platform_organization_id,
            deleted_at: null,
            NOT: {
              id: props.insuranceApiIntegrationId,
            },
          },
        },
      );
    if (duplicate)
      throw new Error(
        "Another API integration with this connection URI already exists for this organization",
      );
  }

  // If insurance_vendor_code is being updated, check org+vendor_code uniqueness (active, not self)
  if (props.body.insurance_vendor_code !== undefined) {
    const vendorDuplicate =
      await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
        {
          where: {
            insurance_vendor_code: props.body.insurance_vendor_code,
            healthcare_platform_organization_id:
              integration.healthcare_platform_organization_id,
            deleted_at: null,
            NOT: {
              id: props.insuranceApiIntegrationId,
            },
          },
        },
      );
    if (vendorDuplicate)
      throw new Error(
        "This insurance vendor code is already used by another integration in this organization",
      );
  }

  // Perform the update with current timestamp for updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.update(
      {
        where: { id: props.insuranceApiIntegrationId },
        data: {
          insurance_vendor_code: props.body.insurance_vendor_code ?? undefined,
          connection_uri: props.body.connection_uri ?? undefined,
          supported_transaction_types:
            props.body.supported_transaction_types ?? undefined,
          status: props.body.status ?? undefined,
          updated_at: now,
        },
      },
    );

  // Format and return the updated DTO (all datetime fields as branded ISO strings)
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    insurance_vendor_code: updated.insurance_vendor_code,
    connection_uri: updated.connection_uri,
    supported_transaction_types: updated.supported_transaction_types,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
