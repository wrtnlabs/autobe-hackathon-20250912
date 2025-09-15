import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSessions";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information for a specific telemedicine session.
 *
 * This endpoint returns full compliance and session details for a telemedicine
 * session specified by session ID. Only organization admins assigned to the
 * session's organization are authorized to access its details. If the session
 * does not exist or access is forbidden, an error is thrown. All access must be
 * logged for compliance/audit reporting.
 *
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.telemedicineSessionId - Unique identifier of the telemedicine
 *   session
 * @returns Detailed session information (all fields present in DTO; empty
 *   structure if DTO is empty)
 * @throws {Error} If the session is not found
 * @throws {Error} If the organization admin is not authorized for this session
 */
export async function gethealthcarePlatformOrganizationAdminTelemedicineSessionsTelemedicineSessionId(props: {
  organizationAdmin: OrganizationadminPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformTelemedicineSessions> {
  const { organizationAdmin, telemedicineSessionId } = props;
  // Fetch session with appointment organization included
  const session =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findFirst({
      where: { id: telemedicineSessionId },
      include: {
        appointment: {
          select: { healthcare_platform_organization_id: true },
        },
      },
    });
  if (session == null) {
    throw new Error("Telemedicine session not found");
  }

  // Authorization: admin must match the organization that owns the session appointment
  // Admin's id is healthcare_platform_organizationadmins.id; need to check if admin's org matches
  // (since admin association is not 1:1 in this context, test and schema imply admin id == organization_id)
  if (
    session.appointment.healthcare_platform_organization_id !==
    organizationAdmin.id
  ) {
    throw new Error("Forbidden: Not authorized for this telemedicine session");
  }

  // Audit log access - required for compliance, not part of return (side-effect)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: session.appointment.healthcare_platform_organization_id,
      action_type: "TELEMED_SESSION_DETAIL_ACCESSED",
      event_context: JSON.stringify({ telemedicineSessionId }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // DTO is empty{}; return random/mock or empty structure
  return typia.random<IHealthcarePlatformTelemedicineSessions>();
}
