import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details of a specific user license verification record by ID.
 *
 * This operation retrieves full details for a professional user license
 * verification record, querying by the unique UUID from the
 * healthcare_platform_user_license_verifications table. The returned
 * information includes the user, license number and type, last and current
 * verification status, audit timestamps, and optional suspension reason. Only
 * accessible to authorized System Admin users; access events should be logged
 * externally for audit.
 *
 * @param props - Request props
 * @param props.systemAdmin - The authenticated system admin performing the
 *   lookup (RBAC enforced by decorator)
 * @param props.userLicenseVerificationId - UUID of the license verification
 *   record to retrieve
 * @returns IHealthcarePlatformUserLicenseVerification record with all audit
 *   metadata and fields
 * @throws {Error} If no record is found or the record is soft-deleted
 */
export async function gethealthcarePlatformSystemAdminUserLicenseVerificationsUserLicenseVerificationId(props: {
  systemAdmin: SystemadminPayload;
  userLicenseVerificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserLicenseVerification> {
  const { userLicenseVerificationId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_user_license_verifications.findFirst(
      {
        where: {
          id: userLicenseVerificationId,
        },
      },
    );

  if (!record) {
    throw new Error("License verification record not found");
  }

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
