import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves the full details for the appointment event specified by
 * appointmentId, including all scheduling and relationship context. Only
 * organization admins assigned to the same organization as the appointment are
 * allowed access. Throws error if appointment is not found, deleted, or user is
 * not permitted to access this resource. Enforces strict org-based scoping for
 * admin users.
 *
 * @param props - Properties required for the request
 * @param props.organizationAdmin - The authenticated organization admin payload
 *   (must have .id, type)
 * @param props.appointmentId - The unique ID of the appointment to retrieve
 *   (UUID)
 * @returns IHealthcarePlatformAppointment - All context fields for the
 *   appointment, fully normalized, with brand types
 * @throws {Error} When the appointment does not exist, is deleted, or admin
 *   does not control its org
 */
export async function gethealthcarePlatformOrganizationAdminAppointmentsAppointmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { organizationAdmin, appointmentId } = props;

  // 1. Find the appointment and check not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found or deleted.");
  }

  // 2. Check that the organizationAdmin is genuinely assigned to that org via org assignment
  const orgRelation =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          appointment.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!orgRelation) {
    throw new Error(
      "Forbidden: organizationAdmin not assigned to this organization.",
    );
  }

  // 3. Return the IHealthcarePlatformAppointment response, converting all dates (never use Date type directly!)
  return {
    id: appointment.id,
    healthcare_platform_organization_id:
      appointment.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      appointment.healthcare_platform_department_id ?? undefined,
    provider_id: appointment.provider_id,
    patient_id: appointment.patient_id,
    status_id: appointment.status_id,
    room_id: appointment.room_id ?? undefined,
    equipment_id: appointment.equipment_id ?? undefined,
    appointment_type: appointment.appointment_type,
    start_time: toISOStringSafe(appointment.start_time),
    end_time: toISOStringSafe(appointment.end_time),
    title: appointment.title ?? undefined,
    description: appointment.description ?? undefined,
    recurrence_rule: appointment.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(appointment.created_at),
    updated_at: toISOStringSafe(appointment.updated_at),
    deleted_at: appointment.deleted_at
      ? toISOStringSafe(appointment.deleted_at)
      : undefined,
  };
}
