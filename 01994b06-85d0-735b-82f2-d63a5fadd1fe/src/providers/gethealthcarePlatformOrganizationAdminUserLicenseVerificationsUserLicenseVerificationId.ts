import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get details of a specific user license verification record by ID.
 *
 * Retrieves the complete license verification record for a professional
 * (doctor, nurse, or technician) by its unique UUID. This includes the user
 * reference, license number and type, most recent verification status, audit
 * timestamps, and any suspension reason. Only authenticated organization admins
 * may access this endpoint, supporting compliance, audit, and credential review
 * workflows.
 *
 * The organizationadmin's JWT is required for authentication. If the specified
 * license verification record does not exist, a 404 error will be thrown. All
 * date fields are returned as ISO 8601 strings. Optional string fields are
 * undefined if not present.
 *
 * @param props - Parameters including the organizationAdmin payload (from JWT
 *   authentication) and the userLicenseVerificationId (UUID of the license
 *   verification record to retrieve)
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation (injected by the controller/decorator).
 * @param props.userLicenseVerificationId - Unique UUID for the license
 *   verification record in healthcare_platform_user_license_verifications.
 * @returns The full details of the requested professional user license
 *   verification record
 * @throws {Error} If no license verification record with the specified ID
 *   exists
 */
export async function gethealthcarePlatformOrganizationAdminUserLicenseVerificationsUserLicenseVerificationId(props: {
  organizationAdmin: OrganizationadminPayload;
  userLicenseVerificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserLicenseVerification> {
  const { userLicenseVerificationId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_user_license_verifications.findUnique(
      {
        where: { id: userLicenseVerificationId },
      },
    );
  if (!record) throw new Error("License verification record not found");
  return {
    id: record.id,
    user_id: record.user_id,
    user_type: record.user_type,
    license_number: record.license_number,
    license_type: record.license_type,
    verification_status: record.verification_status,
    last_verified_at: toISOStringSafe(record.last_verified_at),
    suspend_reason: record.suspend_reason ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
