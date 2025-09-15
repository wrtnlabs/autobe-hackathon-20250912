import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update details for a telemedicine session (TelemedicineSession table) by
 * telemedicineSessionId.
 *
 * This operation updates an existing telemedicine session in the
 * healthcarePlatform service, allowing changes to session times, join link, or
 * recording status. Only organizationAdmin users of the same organization as
 * the linked appointment may perform updates on the session. All actions are
 * audited for compliance.
 *
 * @param props - The operation input parameters
 * @param props.organizationAdmin - The authenticated admin making the request
 * @param props.telemedicineSessionId - The unique identifier of the
 *   telemedicine session to update
 * @param props.body - The update payload (currently empty, reserved for future
 *   updatable fields)
 * @returns The updated telemedicine session record with all fields populated.
 * @throws {Error} If the telemedicine session or associated appointment cannot
 *   be found
 * @throws {Error} If admin is not authorized to modify this session
 */
export async function puthealthcarePlatformOrganizationAdminTelemedicineSessionsTelemedicineSessionId(props: {
  organizationAdmin: OrganizationadminPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformTelemedicineSession.IUpdate;
}): Promise<IHealthcarePlatformTelemedicineSession> {
  const { organizationAdmin, telemedicineSessionId, body } = props;

  // Fetch the telemedicine session
  const session =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findUnique({
      where: { id: telemedicineSessionId },
    });
  if (!session) {
    throw new Error("Telemedicine session not found");
  }

  // Fetch the associated appointment to verify organization context
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: session.appointment_id },
    });
  if (!appointment) {
    throw new Error("Associated appointment not found");
  }
  if (
    appointment.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Unauthorized: Not allowed to update telemedicine sessions outside your organization",
    );
  }

  // Compose update payload (future-proof for when IUpdate has fields)
  const updatePayload: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
    // ...additional updatable fields when IUpdate is extended
  };

  // Update the telemedicine session
  const updated =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.update({
      where: { id: telemedicineSessionId },
      data: updatePayload,
    });

  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    join_link: updated.join_link,
    session_start: toISOStringSafe(updated.session_start),
    session_end: toISOStringSafe(updated.session_end),
    provider_joined_at:
      typeof updated.provider_joined_at === "undefined" ||
      updated.provider_joined_at === null
        ? undefined
        : toISOStringSafe(updated.provider_joined_at),
    patient_joined_at:
      typeof updated.patient_joined_at === "undefined" ||
      updated.patient_joined_at === null
        ? undefined
        : toISOStringSafe(updated.patient_joined_at),
    session_recorded: updated.session_recorded,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
