import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a pharmacy integration by ID
 * (healthcare_platform_pharmacy_integrations)
 *
 * This operation marks a pharmacy integration as deleted by setting its
 * deleted_at timestamp to the current time, preserving the record for
 * compliance and audit. Only systemAdmin may execute this operation. Attempts
 * to delete already deleted or non-existent records result in a 404 error.
 *
 * @param props - Properties for pharmacy integration deletion
 * @param props.systemAdmin - The authenticated system admin user performing the
 *   deletion (must have systemAdmin role)
 * @param props.pharmacyIntegrationId - Unique identifier of the pharmacy
 *   integration record to delete (UUID)
 * @returns Void
 * @throws {Error} If the pharmacy integration does not exist or is already
 *   deleted
 */
export async function deletehealthcarePlatformSystemAdminPharmacyIntegrationsPharmacyIntegrationId(props: {
  systemAdmin: SystemadminPayload;
  pharmacyIntegrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization is determined by controller or framework decorator
  // (props.systemAdmin is required, provides access context)
  const integration =
    await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findFirst({
      where: {
        id: props.pharmacyIntegrationId,
        deleted_at: null,
      },
    });
  if (!integration) {
    throw new Error("Pharmacy integration not found or already deleted"); // System throws 404 Not Found
  }
  await MyGlobal.prisma.healthcare_platform_pharmacy_integrations.update({
    where: { id: props.pharmacyIntegrationId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
