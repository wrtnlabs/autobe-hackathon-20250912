import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves full details for a specific emergency access override audit record
 * by its ID.
 *
 * This endpoint allows an organization admin to retrieve the complete audit
 * record for an emergency access override (break-the-glass event), including
 * all justification, metadata, and compliance review fields. Strict
 * organizational scoping is enforced to ensure only admins of the matching
 * organization can access the event. Dates are returned as ISO 8601 strings,
 * and nullable/optional fields are handled according to the API contract.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated admin's payload (must be an
 *   active organization admin)
 * @param props.emergencyAccessOverrideId - UUID of the override event to fetch
 * @returns IHealthcarePlatformEmergencyAccessOverride - Detailed audit record
 *   for the override event
 * @throws {Error} When the override event does not exist, is deleted, or does
 *   not belong to admin's organization
 */
export async function gethealthcarePlatformOrganizationAdminEmergencyAccessOverridesEmergencyAccessOverrideId(props: {
  organizationAdmin: OrganizationadminPayload;
  emergencyAccessOverrideId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEmergencyAccessOverride> {
  // Step 1: Lookup admin record (ensure admin exists and active)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: props.organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!admin) {
    throw new Error("Forbidden: Organization admin not found or inactive");
  }

  // Step 2: Lookup admin's org assignment (find org context for access enforcement)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: props.organizationAdmin.id,
        deleted_at: null,
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!orgAssignment) {
    throw new Error("Forbidden: Admin is not assigned to any organization");
  }
  const adminOrgId = orgAssignment.healthcare_platform_organization_id;

  // Step 3: Retrieve override event (without deleted_at in where clause)
  const override =
    await MyGlobal.prisma.healthcare_platform_emergency_access_overrides.findFirst(
      {
        where: {
          id: props.emergencyAccessOverrideId,
        },
      },
    );
  if (!override) {
    throw new Error("Not Found: Emergency access override record not found");
  }

  // Step 4: Enforce org access scope
  if (override.organization_id !== adminOrgId) {
    throw new Error(
      "Forbidden: You are not authorized to access this override event",
    );
  }

  // Step 5: Map and return fields, convert all Date fields using toISOStringSafe
  return {
    id: override.id,
    user_id: override.user_id,
    organization_id: override.organization_id,
    reason: override.reason,
    override_scope: override.override_scope,
    override_start_at: toISOStringSafe(override.override_start_at),
    override_end_at: override.override_end_at
      ? toISOStringSafe(override.override_end_at)
      : null,
    reviewed_by_user_id: override.reviewed_by_user_id ?? undefined,
    reviewed_at: override.reviewed_at
      ? toISOStringSafe(override.reviewed_at)
      : undefined,
    created_at: toISOStringSafe(override.created_at),
  };
}
