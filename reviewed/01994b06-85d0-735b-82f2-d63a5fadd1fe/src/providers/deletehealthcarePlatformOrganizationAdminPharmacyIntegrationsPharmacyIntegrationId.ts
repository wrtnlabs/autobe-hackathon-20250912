import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete a pharmacy integration by ID
 * (healthcare_platform_pharmacy_integrations)
 *
 * This operation marks the specified pharmacy integration as deleted (soft
 * delete) by populating the deleted_at timestamp. Only organizationAdmin may
 * delete. If no matching record exists or if it is already deleted, a 404 error
 * is thrown.
 *
 * No physical data removal is performed — this ensures compliance retention.
 *
 * @param props - Parameters for pharmacy integration deletion
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   the operation
 * @param props.pharmacyIntegrationId - UUID of the pharmacy integration to
 *   soft-delete
 * @returns Void
 * @throws {Error} 404 if pharmacy integration not found or already deleted
 * @throws {Error} 403 if not authorized (handled by guard/decorator)
 */
export async function deletehealthcarePlatformOrganizationAdminPharmacyIntegrationsPharmacyIntegrationId(props: {
  organizationAdmin: OrganizationadminPayload;
  pharmacyIntegrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Look up pharmacy integration that is not already deleted
  const integration =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        id: props.pharmacyIntegrationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!integration) {
    throw new Error("Pharmacy integration not found");
  }

  // Set deleted_at to current ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.update({
    where: { id: props.pharmacyIntegrationId },
    data: { deleted_at: now },
  });
  // No data returned (void)
}
