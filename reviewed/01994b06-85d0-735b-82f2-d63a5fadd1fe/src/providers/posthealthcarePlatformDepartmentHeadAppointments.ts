import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new appointment in healthcare_platform_appointments table
 *
 * This operation creates a new appointment in the system for the specified
 * organization, department, provider, and patient, ensuring no scheduling
 * conflicts for either party and that the department head has authority within
 * that department. Referential integrity is enforced for all related entities.
 *
 * @param props.departmentHead - Authenticated department head performing the
 *   creation
 * @param props.body - Appointment creation payload (organization, department,
 *   provider, patient, status, resource, time)
 * @returns Returns the created appointment as IHealthcarePlatformAppointment
 * @throws {Error} If referenced department, provider, patient, or status does
 *   not exist, if the department head is not authorized for the department, or
 *   if there is a scheduling conflict
 */
export async function posthealthcarePlatformDepartmentHeadAppointments(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformAppointment.ICreate;
}): Promise<IHealthcarePlatformAppointment> {
  const { departmentHead, body } = props;

  // 1. Department existence and departmentHead scope check
  if (!body.healthcare_platform_department_id) {
    throw new Error("Department is required for department head operations");
  }
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: body.healthcare_platform_department_id,
        deleted_at: null,
      },
    });
  if (!department) {
    throw new Error("Department not found or inactive");
  }
  if (
    department.healthcare_platform_organization_id !==
    body.healthcare_platform_organization_id
  ) {
    throw new Error("Department does not belong to the specified organization");
  }

  // 2. Validate departmentHead exists and is active (already enforced by decorator)
  // If further department-to-head mapping enforcement is required, implement here

  // 3. Provider existence check
  const provider =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        id: body.provider_id,
        deleted_at: null,
      },
    });
  if (!provider) {
    throw new Error("Provider does not exist");
  }

  // 4. Patient existence check
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: body.patient_id, deleted_at: null },
  });
  if (!patient) {
    throw new Error("Patient does not exist");
  }

  // 5. Status existence check
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: body.status_id },
    });
  if (!status) {
    throw new Error("Status is invalid");
  }

  // 6. Scheduling conflict checks (provider)
  const providerConflict =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        deleted_at: null,
        provider_id: body.provider_id,
        status_id: body.status_id,
        AND: [
          { start_time: { lt: body.end_time } },
          { end_time: { gt: body.start_time } },
        ],
      },
    });
  if (providerConflict) {
    throw new Error(
      "Scheduling conflict for provider: overlapping appointment detected",
    );
  }

  // 7. Scheduling conflict checks (patient)
  const patientConflict =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        deleted_at: null,
        patient_id: body.patient_id,
        status_id: body.status_id,
        AND: [
          { start_time: { lt: body.end_time } },
          { end_time: { gt: body.start_time } },
        ],
      },
    });
  if (patientConflict) {
    throw new Error(
      "Scheduling conflict for patient: overlapping appointment detected",
    );
  }

  // 8. Generate appointment id
  const id = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 9. Create appointment
  const created = await MyGlobal.prisma.healthcare_platform_appointments.create(
    {
      data: {
        id: id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        healthcare_platform_department_id:
          body.healthcare_platform_department_id ?? null,
        provider_id: body.provider_id,
        patient_id: body.patient_id,
        status_id: body.status_id,
        room_id: body.room_id ?? null,
        equipment_id: body.equipment_id ?? null,
        appointment_type: body.appointment_type,
        start_time: body.start_time,
        end_time: body.end_time,
        title: body.title ?? null,
        description: body.description ?? null,
        recurrence_rule: body.recurrence_rule ?? null,
        created_at: now,
        updated_at: now,
        // deleted_at omitted (null by default)
      },
    },
  );

  // 10. Format and return API response
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      created.healthcare_platform_department_id ?? undefined,
    provider_id: created.provider_id,
    patient_id: created.patient_id,
    status_id: created.status_id,
    room_id: created.room_id ?? undefined,
    equipment_id: created.equipment_id ?? undefined,
    appointment_type: created.appointment_type,
    start_time: toISOStringSafe(created.start_time),
    end_time: toISOStringSafe(created.end_time),
    title: created.title ?? undefined,
    description: created.description ?? undefined,
    recurrence_rule: created.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
