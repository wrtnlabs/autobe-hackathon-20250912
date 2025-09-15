import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a telemedicine session by telemedicineSessionId
 * (TelemedicineSession table hard delete).
 *
 * This operation permanently removes a telemedicine session from the system.
 * Only organizationAdmin users who are assigned to the target organization (as
 * determined by the linked appointment's organization ID) can perform this
 * action. The session and all related metadata are deleted and cannot be
 * recovered. The operation is audited for permission checks and compliance, and
 * deletion may be rejected if the admin is not assigned to the organization
 * that owns the session.
 *
 * @param props - Operation parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the deletion
 * @param props.telemedicineSessionId - The UUID of the telemedicine session to
 *   permanently delete
 * @returns Void
 * @throws {Error} When the session, appointment, or organization assignment is
 *   not found, or admin lacks permission
 */
export async function deletehealthcarePlatformOrganizationAdminTelemedicineSessionsTelemedicineSessionId(props: {
  organizationAdmin: OrganizationadminPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the telemedicine session by Id
  const session =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findUnique({
      where: { id: props.telemedicineSessionId },
    });
  if (!session) throw new Error("Telemedicine session not found");

  // 2. Retrieve the appointment to determine the organization context
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: session.appointment_id },
      select: { healthcare_platform_organization_id: true },
    });
  if (!appointment)
    throw new Error("Appointment not found for the provided session");

  // 3. Ensure the organization admin has an org assignment for the target organization
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: props.organizationAdmin.id,
        healthcare_platform_organization_id:
          appointment.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!orgAssignment)
    throw new Error(
      "You do not have permission to delete sessions for this organization",
    );

  // 4. Perform hard delete (no soft delete field exists)
  await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.delete({
    where: { id: props.telemedicineSessionId },
  });
}
