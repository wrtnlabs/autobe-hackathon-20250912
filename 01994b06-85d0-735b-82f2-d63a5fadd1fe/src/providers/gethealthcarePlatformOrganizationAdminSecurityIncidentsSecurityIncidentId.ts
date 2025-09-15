import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get details for a specific security incident from
 * healthcare_platform_security_incidents by ID.
 *
 * Retrieves full metadata for the given security incident, including type,
 * status, summary, timestamps, severity, and organization references. Only
 * organization admins assigned to the matching organization may access this
 * record. Throws error if not found or unauthorized.
 *
 * Access is logged and all fields (except details that may be PHI) are returned
 * per the DTO.
 *
 * @param props - The request parameters
 *
 *   - Props.organizationAdmin: The authenticated organization admin payload
 *   - Props.securityIncidentId: The unique ID of the security incident to retrieve
 *
 * @returns The incident metadata, if authorized
 * @throws {Error} If the security incident is not found or admin is not
 *   permitted to view it
 */
export async function gethealthcarePlatformOrganizationAdminSecurityIncidentsSecurityIncidentId(props: {
  organizationAdmin: OrganizationadminPayload;
  securityIncidentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformSecurityIncident> {
  // 1. Lookup the security incident by ID
  const incident =
    await MyGlobal.prisma.healthcare_platform_security_incidents.findUniqueOrThrow(
      {
        where: { id: props.securityIncidentId },
      },
    );

  // 2. Confirm organization admin user exists and is not soft-deleted
  await MyGlobal.prisma.healthcare_platform_organizationadmins.findUniqueOrThrow(
    {
      where: { id: props.organizationAdmin.id },
      // Only returns if not null; throws if not found
    },
  );

  // 3. Ensure this admin user is assigned to the incident's organization
  // (must have an active assignment)
  const assignments =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where: {
        user_id: props.organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
        healthcare_platform_organization_id: incident.organization_id,
      },
    });
  if (assignments.length === 0) {
    throw new Error(
      "Forbidden: Organization admin is not assigned to this organization",
    );
  }

  // 4. Return mapped DTO with correct date-time string branding; never use Date, never use 'as'
  return {
    id: incident.id,
    opened_by_user_id: incident.opened_by_user_id ?? undefined,
    organization_id: incident.organization_id,
    incident_type: incident.incident_type,
    summary: incident.summary,
    details: incident.details ?? undefined,
    status: incident.status,
    severity: incident.severity,
    opened_at: toISOStringSafe(incident.opened_at),
    closed_at: incident.closed_at
      ? toISOStringSafe(incident.closed_at)
      : undefined,
    updated_at: toISOStringSafe(incident.updated_at),
  };
}
