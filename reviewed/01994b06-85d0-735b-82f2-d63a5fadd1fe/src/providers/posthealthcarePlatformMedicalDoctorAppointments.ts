import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new appointment in healthcare_platform_appointments table
 *
 * This operation allows an authenticated medical doctor to create a new
 * appointment event within the healthcare platform. It ensures all business
 * logic including:
 *
 * - Only the authenticated doctor (medicalDoctor) can create an appointment for
 *   themselves (provider_id must match authenticated doctor)
 * - Existence and referential integrity of organization, department (if
 *   specified), patient, and status entities
 * - Scheduling conflict checks: Prevents overlapping appointments for the
 *   provider and for the patient
 * - All dates and timestamps are ISO8601 strings (never native Date)
 * - All IDs are generated as UUIDv4 and typed properly
 *
 * @param props - Object containing:
 *
 *   - MedicalDoctor: Authenticated MedicaldoctorPayload
 *   - Body: IHealthcarePlatformAppointment.ICreate (request body)
 *
 * @returns IHealthcarePlatformAppointment DTO
 * @throws {Error} If authorization fails, references are invalid, or scheduling
 *   conflicts are detected
 */
export async function posthealthcarePlatformMedicalDoctorAppointments(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformAppointment.ICreate;
}): Promise<IHealthcarePlatformAppointment> {
  const { medicalDoctor, body } = props;

  // 1. Authorize: can only assign self as provider
  if (body.provider_id !== medicalDoctor.id) {
    throw new Error(
      "Doctor can only create appointments where provider_id is themselves.",
    );
  }

  // 2. Organization exists and active
  const organization =
    await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
      where: {
        id: body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!organization) {
    throw new Error("Organization not found or deleted");
  }

  // 3. Department exists if provided
  if (
    body.healthcare_platform_department_id !== undefined &&
    body.healthcare_platform_department_id !== null
  ) {
    const dept =
      await MyGlobal.prisma.healthcare_platform_departments.findFirst({
        where: {
          id: body.healthcare_platform_department_id,
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
          deleted_at: null,
        },
      });
    if (!dept) {
      throw new Error("Department not found or not under this organization");
    }
  }

  // 4. Patient exists
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: body.patient_id,
      deleted_at: null,
    },
  });
  if (!patient) {
    throw new Error("Patient not found or deleted");
  }

  // 5. Status exists
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: {
        id: body.status_id,
      },
    });
  if (!status) {
    throw new Error("Appointment status not found");
  }

  // 6. Scheduling conflicts for provider
  const providerOverlap =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        deleted_at: null,
        provider_id: body.provider_id,
        OR: [
          {
            start_time: { lt: body.end_time },
            end_time: { gt: body.start_time },
          },
        ],
      },
    });
  if (providerOverlap) {
    throw new Error("This provider is already booked for this time.");
  }
  // Scheduling conflicts for patient
  const patientOverlap =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        deleted_at: null,
        patient_id: body.patient_id,
        OR: [
          {
            start_time: { lt: body.end_time },
            end_time: { gt: body.start_time },
          },
        ],
      },
    });
  if (patientOverlap) {
    throw new Error("This patient is already booked for this time.");
  }

  const now = toISOStringSafe(new Date());
  const apptId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.healthcare_platform_appointments.create(
    {
      data: {
        id: apptId,
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
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      created.healthcare_platform_department_id ?? null,
    provider_id: created.provider_id,
    patient_id: created.patient_id,
    status_id: created.status_id,
    room_id: created.room_id ?? null,
    equipment_id: created.equipment_id ?? null,
    appointment_type: created.appointment_type,
    start_time: created.start_time,
    end_time: created.end_time,
    title: created.title ?? null,
    description: created.description ?? null,
    recurrence_rule: created.recurrence_rule ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
