import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves full details for a specific emergency access override audit record
 * by its ID.
 *
 * This operation allows system administrators to fetch the detailed audit trail
 * of a single 'break-the-glass' (emergency access override) event from the
 * healthcare_platform_emergency_access_overrides table. It includes complete
 * metadata: user, organization, business reason, override data scope, override
 * period, review status, and timestamps for full compliance review, safety, and
 * regulatory audit. A 404 error is thrown if the override record does not
 * exist.
 *
 * Authorization: Only accessible to authenticated system administrators.
 * Contractually enforced via decorator/systemAdmin payload.
 *
 * @param props - SystemAdmin: Authenticated SystemadminPayload (must be a valid
 *   system admin user). emergencyAccessOverrideId: Unique identifier (UUID) of
 *   the emergency access override record to retrieve.
 * @returns The detailed IHealthcarePlatformEmergencyAccessOverride audit record
 *   for this event. All required fields are populated; type and nullability are
 *   strictly validated.
 * @throws {Error} 404 if the emergency access override record is not found
 */
export async function gethealthcarePlatformSystemAdminEmergencyAccessOverridesEmergencyAccessOverrideId(props: {
  systemAdmin: SystemadminPayload;
  emergencyAccessOverrideId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEmergencyAccessOverride> {
  const record =
    await MyGlobal.prisma.healthcare_platform_emergency_access_overrides.findUniqueOrThrow(
      {
        where: { id: props.emergencyAccessOverrideId },
      },
    );
  return {
    id: record.id,
    user_id: record.user_id,
    organization_id: record.organization_id,
    reason: record.reason,
    override_scope: record.override_scope,
    override_start_at: toISOStringSafe(record.override_start_at),
    override_end_at:
      record.override_end_at !== null && record.override_end_at !== undefined
        ? toISOStringSafe(record.override_end_at)
        : null,
    reviewed_by_user_id:
      record.reviewed_by_user_id !== null &&
      record.reviewed_by_user_id !== undefined
        ? record.reviewed_by_user_id
        : undefined,
    reviewed_at:
      record.reviewed_at !== null && record.reviewed_at !== undefined
        ? toISOStringSafe(record.reviewed_at)
        : undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
