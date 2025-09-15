import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Create a new appointment event in the healthcare platform scheduling system.
 *
 * This function allows an authenticated receptionist to schedule an appointment
 * between a provider and a patient within an organization. It strictly
 * validates all required resources and checks for scheduling conflicts
 * (double-booking) for both provider and patient. All date values are handled
 * as string & tags.Format<'date-time'>, and UUIDs are generated using v4().
 *
 * The function ensures:
 *
 * - The referenced organization, department (if provided), provider assignment,
 *   and patient must exist and not be soft-deleted.
 * - The status_id must exist.
 * - Neither the provider nor the patient has an overlapping non-deleted
 *   appointment in the specified time window.
 * - All entity lookups and writes are performed in a type-safe manner.
 *
 * The operation is compliant for use within multi-tenant healthcare platform
 * scheduling, with all results returning as strictly typed, fully-normalized
 * appointment objects.
 *
 * @param props - Arguments for the appointment creation payload
 * @param props.receptionist - The JWT-authenticated receptionist payload
 * @param props.body - The IHealthcarePlatformAppointment.ICreate input
 *   containing all required appointment fields
 * @returns The full IHealthcarePlatformAppointment of the newly created record
 * @throws {Error} If any referenced entity does not exist or is deleted, or if
 *   there is a scheduling conflict for the specified time window
 */
export async function posthealthcarePlatformReceptionistAppointments(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformAppointment.ICreate;
}): Promise<IHealthcarePlatformAppointment> {
  const { receptionist, body } = props;

  // Validate organization (must exist, not soft-deleted)
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (!org) throw new Error("Organization not found or deleted");

  // Validate department if supplied (must exist, not soft-deleted, in org)
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
    if (!dept) throw new Error("Department not found or deleted");
  }

  // Validate provider assignment (must exist, not soft-deleted, in org)
  const provider =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        id: body.provider_id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!provider)
    throw new Error("Provider not found or not active in organization");

  // Validate patient (must exist, not soft-deleted)
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: body.patient_id,
      deleted_at: null,
    },
  });
  if (!patient) throw new Error("Patient not found or deleted");

  // Validate status (must exist)
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: body.status_id },
    });
  if (!status) throw new Error("Appointment status not found");

  // Check for provider double-booking within the requested time window
  const providerConflict =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        provider_id: body.provider_id,
        deleted_at: null,
        AND: [
          { start_time: { lt: body.end_time } },
          { end_time: { gt: body.start_time } },
        ],
      },
    });
  if (providerConflict)
    throw new Error("Provider is already booked for an overlapping time slot");

  // Check for patient double-booking within the requested time window
  const patientConflict =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        patient_id: body.patient_id,
        deleted_at: null,
        AND: [
          { start_time: { lt: body.end_time } },
          { end_time: { gt: body.start_time } },
        ],
      },
    });
  if (patientConflict)
    throw new Error("Patient is already booked for an overlapping time slot");

  // Prepare the ID and timestamp
  const generatedId = v4();
  const now = toISOStringSafe(new Date());

  // Create the appointment
  const created = await MyGlobal.prisma.healthcare_platform_appointments.create(
    {
      data: {
        id: generatedId,
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

  // Return the fully-typed appointment (all dates as ISO strings)
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
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
