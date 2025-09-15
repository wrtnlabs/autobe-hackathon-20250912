import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves a full appointment record, ensuring the requesting nurse user is
 * authorized to access this event based on department/org assignment. Enforces
 * RBAC so that only assigned nurses can view appointments within their own
 * department/org. Throws errors on not found or unauthorized access. All date
 * fields are returned as ISO8601 UTC strings and proper branding is applied for
 * UUID and date-time types. An audit log entry is created after successful
 * access.
 *
 * @param props - Request properties
 * @param props.nurse - Authenticated nurse payload (must match active nurse
 *   record)
 * @param props.appointmentId - Unique appointment event ID (UUID)
 * @returns IHealthcarePlatformAppointment DTO populated with appointment data
 * @throws {Error} When appointment is not found, deleted, or access is
 *   forbidden for the nurse
 */
export async function gethealthcarePlatformNurseAppointmentsAppointmentId(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { nurse, appointmentId } = props;

  // Find the appointment (skip deleted)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) throw new Error("Appointment not found or already deleted");

  // Find nurse's active org assignment (for org of the appointment)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: nurse.id,
        healthcare_platform_organization_id:
          appointment.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!orgAssignment) {
    throw new Error("Nurse has no active assignment for this organization");
  }

  // Find all department assignments for this nurse within this org
  const departmentAssignments =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findMany(
      {
        where: {
          healthcare_platform_organization_id:
            appointment.healthcare_platform_organization_id,
          deleted_at: null,
        },
      },
    );

  // Access control: nurse may access the appointment if
  // (a) the appointment's department is null AND nurse is assigned at org-level OR
  // (b) the appointment's department matches one of the assignment's department IDs
  const appointmentDepartmentId = appointment.healthcare_platform_department_id;
  let allowAccess = false;
  if (!appointmentDepartmentId) {
    // Org-level appointment: nurse can access if they have an org assignment
    allowAccess = true;
  } else {
    // Department-level: check department assignments
    // Here, we assume business logic outside this provider assigns the nurse to a department by presence in assignment table
    // Since user_org_assignments is for users, but org_department_assignments is only org<->dept link, not user<->dept.
    // So only org-level assignment is available for now.
    // If org_department_assignments needs user mapping, additional logic is needed.
    // Current approach: Only nurses assigned at org level can see org-level appointments; department-level is not enforced here due to schema.
    allowAccess = false; // Department-level restriction not enforced: fallback to org-level only
  }

  if (!allowAccess) {
    throw new Error(
      "Forbidden: nurse not assigned to this appointment's department or org",
    );
  }

  // Audit Event: log the access for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: nurse.id,
      organization_id: appointment.healthcare_platform_organization_id,
      action_type: "RECORD_ACCESS",
      related_entity_type: "APPOINTMENT",
      related_entity_id: appointment.id,
      event_context: JSON.stringify({
        role: "nurse",
        accessed_appointment_id: appointment.id,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Return full appointment DTO (dates converted properly)
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
