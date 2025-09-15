import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function gethealthcarePlatformSystemAdminSecurityIncidentsSecurityIncidentId(props: {
  systemAdmin: SystemadminPayload;
  securityIncidentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformSecurityIncident> {
  const { systemAdmin, securityIncidentId } = props;

  // Retrieve security incident by ID
  const incident =
    await MyGlobal.prisma.healthcare_platform_security_incidents.findUnique({
      where: { id: securityIncidentId },
    });
  if (!incident) throw new Error("Security incident not found");

  // Log audit event for compliance after successful retrieval
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">, // Explicitly provide unique id (no default)
      user_id: systemAdmin.id,
      organization_id: incident.organization_id,
      action_type: "SECURITY_INCIDENT_VIEW",
      related_entity_type: "SECURITY_INCIDENT",
      related_entity_id: incident.id,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Map to DTO, applying strict null/undefined handling and toISOStringSafe for dates
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
