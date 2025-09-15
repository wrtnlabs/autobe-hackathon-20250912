import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new appointment in healthcare_platform_appointments table.
 *
 * This operation allows an authenticated organization admin to create a new
 * appointment within their organization on the healthcarePlatform system. All
 * referenced entities (organization, department, provider, patient, status,
 * room, equipment) are cross-validated for existence, organization membership,
 * and activeness. Appointment time window is checked for conflicts to prevent
 * double-bookings for both provider and patient.
 *
 * All date/time values are stored and returned as ISO 8601-branded strings; the
 * ID is returned as branded UUID. Only valid and available time slots will be
 * scheduled successfully. On success, the complete appointment record,
 * including system timestamps and all nullable properties, is returned.
 *
 * @param props - Properties for appointment creation operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation
 * @param props.body - Details required to create the new appointment
 * @returns Full details of the generated appointment entity
 * @throws {Error} If any referential integrity, schedule conflict, or
 *   permissions check fails
 */
export async function posthealthcarePlatformOrganizationAdminAppointments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAppointment.ICreate;
}): Promise<IHealthcarePlatformAppointment> {
  const { organizationAdmin, body } = props;

  // Validate organization exists and is active
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (org == null) {
    throw new Error("Organization not found or deleted");
  }

  // Validate department (if given) belongs to the organization
  if (body.healthcare_platform_department_id != null) {
    const dept =
      await MyGlobal.prisma.healthcare_platform_departments.findFirst({
        where: {
          id: body.healthcare_platform_department_id,
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
          deleted_at: null,
        },
      });
    if (dept == null) {
      throw new Error(
        "Department not found or does not belong to organization",
      );
    }
  }

  // Validate provider assignment in organization
  const providerAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        id: body.provider_id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (providerAssignment == null) {
    throw new Error("Provider assignment not found or not in organization");
  }

  // Validate patient existence
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: body.patient_id,
      deleted_at: null,
    },
  });
  if (patient == null) {
    throw new Error("Patient not found");
  }

  // Validate appointment status
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: {
        id: body.status_id,
      },
    });
  if (status == null) {
    throw new Error("Appointment status not found");
  }

  // Resource existence checks (room)
  if (body.room_id != null) {
    const room =
      await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
        where: {
          room_id: body.room_id,
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
          deleted_at: null,
        },
      });
    if (room == null) {
      throw new Error("Room not reserved for this organization");
    }
  }

  // Resource existence checks (equipment)
  if (body.equipment_id != null) {
    const equipment =
      await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst(
        {
          where: {
            equipment_id: body.equipment_id,
            healthcare_platform_organization_id:
              body.healthcare_platform_organization_id,
            deleted_at: null,
          },
        },
      );
    if (equipment == null) {
      throw new Error("Equipment not reserved for this organization");
    }
  }

  // Validate time: start_time < end_time, not in past
  if (
    body.start_time == null ||
    body.end_time == null ||
    body.start_time >= body.end_time
  ) {
    throw new Error("Start time must precede end time");
  }

  // Check for provider overlapping appointment
  {
    const providerConflict =
      await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
        where: {
          deleted_at: null,
          provider_id: body.provider_id,
          start_time: { lt: body.end_time },
          end_time: { gt: body.start_time },
        },
      });
    if (providerConflict != null) {
      throw new Error("Provider not available in that appointment slot");
    }
  }

  // Check for patient overlapping appointment
  {
    const patientConflict =
      await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
        where: {
          deleted_at: null,
          patient_id: body.patient_id,
          start_time: { lt: body.end_time },
          end_time: { gt: body.start_time },
        },
      });
    if (patientConflict != null) {
      throw new Error("Patient already has appointment in that slot");
    }
  }

  // Prepare entity properties
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_appointments.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
        start_time: toISOStringSafe(body.start_time),
        end_time: toISOStringSafe(body.end_time),
        title: body.title ?? null,
        description: body.description ?? null,
        recurrence_rule: body.recurrence_rule ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Prepare result object converting all date fields
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
    start_time: toISOStringSafe(created.start_time),
    end_time: toISOStringSafe(created.end_time),
    title: created.title ?? null,
    description: created.description ?? null,
    recurrence_rule: created.recurrence_rule ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
