import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update configuration of an existing insurance API integration
 *
 * Updates an existing insurance API integration configuration record for a
 * healthcare organization, allowing administrators to reconfigure the vendor
 * code, connection URI, supported transaction types, or operational status.
 * Ensures uniqueness of the combination organization and vendor code. Only
 * authenticated organizationadmins can perform this action. Throws an error if
 * the target integration does not exist or is soft deleted.
 *
 * @param props - Properties for operation
 * @param props.organizationAdmin - The authenticated organization administrator
 * @param props.insuranceApiIntegrationId - UUID identifying the insurance API
 *   integration configuration to update
 * @param props.body - The configuration updates (all fields optional)
 * @returns The updated insurance API integration configuration object
 * @throws {Error} When the specified insurance API integration does not exist
 *   or is soft deleted
 */
export async function puthealthcarePlatformOrganizationAdminInsuranceApiIntegrationsInsuranceApiIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceApiIntegrationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceApiIntegration.IUpdate;
}): Promise<IHealthcarePlatformInsuranceApiIntegration> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const integration =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findFirst(
      {
        where: {
          id: props.insuranceApiIntegrationId,
          deleted_at: null,
        },
      },
    );
  if (!integration) {
    throw new Error("Insurance API integration not found");
  }

  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_api_integrations.update(
      {
        where: { id: props.insuranceApiIntegrationId },
        data: {
          ...(props.body.insurance_vendor_code !== undefined && {
            insurance_vendor_code: props.body.insurance_vendor_code,
          }),
          ...(props.body.connection_uri !== undefined && {
            connection_uri: props.body.connection_uri,
          }),
          ...(props.body.supported_transaction_types !== undefined && {
            supported_transaction_types: props.body.supported_transaction_types,
          }),
          ...(props.body.status !== undefined && { status: props.body.status }),
          updated_at: now,
        },
      },
    );

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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
