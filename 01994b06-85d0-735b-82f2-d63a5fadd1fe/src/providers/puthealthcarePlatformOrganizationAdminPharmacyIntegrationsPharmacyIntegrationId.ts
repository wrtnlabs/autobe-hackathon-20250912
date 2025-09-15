import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a pharmacy integration by ID
 * (healthcare_platform_pharmacy_integrations)
 *
 * Updates configuration, connection URI, protocol, status, or vendor code
 * fields for an existing pharmacy integration. Prevents duplicate active vendor
 * codes within the same organization and disallows updating soft-deleted
 * integrations. Requires valid organizationAdmin permission. Audit logging and
 * compliance triggers handled by upstream service layers.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin user
 * @param props.pharmacyIntegrationId - UUID of the pharmacy integration to
 *   update
 * @param props.body - Update payload: changed connection URI, status, protocol,
 *   or vendor code
 * @returns The updated pharmacy integration configuration object
 * @throws {Error} If not found, already soft-deleted, insufficient permission,
 *   or duplicate active vendor code
 */
export async function puthealthcarePlatformOrganizationAdminPharmacyIntegrationsPharmacyIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  pharmacyIntegrationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPharmacyIntegration.IUpdate;
}): Promise<IHealthcarePlatformPharmacyIntegration> {
  const { organizationAdmin, pharmacyIntegrationId, body } = props;

  // Find the pharmacy integration; must exist and not be soft-deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        id: pharmacyIntegrationId,
        deleted_at: null,
      },
    });
  if (!integration) {
    throw new Error("Pharmacy integration not found or has been deleted");
  }

  // Business constraint: Updating pharmacy_vendor_code cannot duplicate an active code for this org
  if (
    body.pharmacy_vendor_code !== undefined &&
    body.pharmacy_vendor_code !== integration.pharmacy_vendor_code
  ) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst(
        {
          where: {
            healthcare_platform_organization_id:
              integration.healthcare_platform_organization_id,
            pharmacy_vendor_code: body.pharmacy_vendor_code,
            deleted_at: null,
          },
        },
      );
    if (duplicate) {
      throw new Error("Duplicate pharmacy_vendor_code for this organization");
    }
  }

  // Always update updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.update({
      where: { id: pharmacyIntegrationId },
      data: {
        connection_uri: body.connection_uri ?? undefined,
        supported_protocol: body.supported_protocol ?? undefined,
        status: body.status ?? undefined,
        pharmacy_vendor_code: body.pharmacy_vendor_code ?? undefined,
        updated_at: now,
      },
    });

  // Return with all date/datetime fields as string & tags.Format<'date-time'>, deleted_at is nullable/optional
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
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
