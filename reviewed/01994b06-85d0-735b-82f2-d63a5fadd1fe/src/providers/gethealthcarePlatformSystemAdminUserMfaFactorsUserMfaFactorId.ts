import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get full detail of a user MFA factor by ID.
 *
 * This endpoint retrieves detailed configuration and metadata for a specific
 * user MFA factor record in the healthcarePlatform. It strictly enforces RBAC:
 * only the owner system admin (matching user_id and role) can access their MFA
 * factor record. All returned date fields are formatted as ISO8601 strings and
 * branded to satisfy the API contract. Throws a standard not-found error if the
 * MFA factor record does not exist, and throws an authorization error if the
 * caller does not own the MFA factor.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the request
 * @param props.userMfaFactorId - UUID of the user MFA factor record to retrieve
 * @returns Full configuration details and metadata of the specified MFA factor,
 *   with dates branded per API structure
 * @throws {Error} If the MFA factor record does not exist
 * @throws {Error} If the authenticated admin is not the owner of the MFA factor
 *   or if the MFA record is not for a systemadmin
 */
export async function gethealthcarePlatformSystemAdminUserMfaFactorsUserMfaFactorId(props: {
  systemAdmin: SystemadminPayload;
  userMfaFactorId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserMfaFactor> {
  const { systemAdmin, userMfaFactorId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findUnique({
      where: { id: userMfaFactorId },
    });
  if (!record) throw new Error("MFA factor not found");
  // Only allow access if the MFA factor belongs to the requesting system admin
  if (record.user_type !== "systemadmin" || record.user_id !== systemAdmin.id) {
    throw new Error("Unauthorized: Cannot access this MFA factor");
  }
  return {
    id: record.id,
    user_id: record.user_id,
    user_type: record.user_type,
    factor_type: record.factor_type,
    factor_value: record.factor_value,
    priority: record.priority,
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
