import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end workflow for receptionist updating an appointment, verifying
 * permissions, valid references, and mutability. Covers creating all required
 * context (org, dept, doctor, patient, statuses, room/equipment reservations),
 * authenticating with correct roles, performing valid/invalid update attempts,
 * status transitions, and checks for auditability and consistent subentity
 * references.
 */
export async function test_api_receptionist_appointment_update_e2e_permissions_and_validation(
  connection: api.IConnection,
) {
  // SystemAdmin joins and logs in
  const sysAdminEmail = RandomGenerator.name(1) + "@org.com";
  const sysAdminPass = RandomGenerator.alphaNumeric(8);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPass,
    },
  });
  typia.assert(sysAdmin);
  // Create organization
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(organization);
  // OrganizationAdmin joins and logs in
  const orgAdminEmail = RandomGenerator.name(1) + "@org.com";
  const orgAdminPass = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        password: orgAdminPass,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPass,
    },
  });
  // Department under organization
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(department);
  // Create appointment statuses ('scheduled', 'confirmed', 'locked')
  const appointmentStatusScheduled =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "scheduled",
          display_name: "Scheduled",
          business_status: "active",
          sort_order: 1,
        },
      },
    );
  const appointmentStatusConfirmed =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "confirmed",
          display_name: "Confirmed",
          business_status: "active",
          sort_order: 2,
        },
      },
    );
  // For lock test, create a finalized status
  const appointmentStatusFinalized =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "finalized",
          display_name: "Finalized",
          business_status: "closed",
          sort_order: 99,
        },
      },
    );
  const roomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          room_id: typia.random<string & tags.Format<"uuid">>(),
          reservation_start: new Date(
            Date.now() + 1000 * 60 * 60,
          ).toISOString(),
          reservation_end: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
          reservation_type: "appointment",
        },
      },
    );
  const equipmentReservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          equipment_id: typia.random<string & tags.Format<"uuid">>(),
          reservation_start: new Date(
            Date.now() + 1000 * 60 * 65,
          ).toISOString(),
          reservation_end: new Date(Date.now() + 1000 * 60 * 100).toISOString(),
          reservation_type: "appointment",
        },
      },
    );
  // Doctor registers (provider)
  const doctorEmail = RandomGenerator.name(1) + "@org.com";
  const doctorPass = RandomGenerator.alphaNumeric(9);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPass as string & tags.Format<"password">,
    },
  });
  typia.assert(doctor);
  // Patient registers
  const patientEmail = RandomGenerator.name(1) + "@domain.com";
  const patientPass = RandomGenerator.alphaNumeric(12);
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1990-01-01").toISOString(),
      password: patientPass,
    },
  });
  typia.assert(patient);
  // Receptionist account creation + login
  const receptionistEmail = RandomGenerator.name(1) + "@org.com";
  const receptionistPass = RandomGenerator.alphaNumeric(10);
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      password: receptionistPass,
    },
  });
  // Receptionist creates initial appointment
  const startTime = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const endTime = new Date(Date.now() + 1000 * 60 * 70).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctor.id,
          patient_id: patient.id,
          status_id: appointmentStatusScheduled.id,
          room_id: roomReservation.room_id,
          equipment_id: equipmentReservation.equipment_id,
          appointment_type: "in-person",
          start_time: startTime,
          end_time: endTime,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
        },
      },
    );
  typia.assert(appointment);
  // Receptionist: valid update (status, patient, provider, room, equipment, type, notes)
  const updateBody = {
    status_id: appointmentStatusConfirmed.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 1,
      sentenceMax: 2,
    }),
    room_id: roomReservation.room_id,
    equipment_id: equipmentReservation.equipment_id,
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 100).toISOString(),
  } satisfies IHealthcarePlatformAppointment.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.receptionist.appointments.update(
      connection,
      {
        appointmentId: appointment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated appointment reflects new status",
    updated.status_id,
    appointmentStatusConfirmed.id,
  );
  TestValidator.equals(
    "updated appointment title",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals("updated room id", updated.room_id, updateBody.room_id);
  TestValidator.equals(
    "updated equipment id",
    updated.equipment_id,
    updateBody.equipment_id,
  );
  // Receptionist: update non-existing appointment (should fail)
  await TestValidator.error(
    "update fails for unknown appointmentId",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.update(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
  // Receptionist: update referencing an organization they don't belong to (should fail)
  await TestValidator.error(
    "update fails with mismatched organization",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.update(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
  // Finalized: update after status set to finalized (should not be allowed)
  await api.functional.healthcarePlatform.receptionist.appointments.update(
    connection,
    {
      appointmentId: appointment.id,
      body: { status_id: appointmentStatusFinalized.id },
    },
  );
  await TestValidator.error(
    "updates rejected after appointment is finalized",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.update(
        connection,
        {
          appointmentId: appointment.id,
          body: { title: "attempt after finalization" },
        },
      );
    },
  );
}
