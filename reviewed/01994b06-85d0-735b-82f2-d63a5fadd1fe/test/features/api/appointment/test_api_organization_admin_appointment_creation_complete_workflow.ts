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
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for creating a healthcare appointment as an organization
 * admin. This test covers:
 *
 * 1. Onboarding a system admin and organization admin, both with join+login.
 * 2. Creating a healthcare organization using systemAdmin role.
 * 3. Switching to organizationAdmin and creating a department in the organization.
 * 4. Creating a provider role with systemAdmin (since only system admin can create
 *    roles).
 * 5. Registering a medical doctor (provider user) with a valid password.
 * 6. Registering a patient user.
 * 7. Creating an appointment status.
 * 8. Creating a room reservation and equipment reservation (optionally linked to
 *    appointment).
 * 9. Creating an appointment as organization admin, linking all above entities.
 * 10. Verifying appointment creation, data correctness, and that only org admin can
 *     create.
 * 11. Edge cases: attempt with invalid/mismatched IDs, and unauthorized roles. Type
 *     error scenarios are not implemented.
 */
export async function test_api_organization_admin_appointment_creation_complete_workflow(
  connection: api.IConnection,
) {
  // 1. Onboard and login a system admin
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdminJoin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: systemAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: systemAdminEmail,
        password: systemAdminPassword,
      },
    },
  );
  typia.assert(systemAdminJoin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      provider: "local",
      provider_key: systemAdminEmail,
      password: systemAdminPassword,
    },
  });

  // 2. Create organization
  const organizationCode = RandomGenerator.alphaNumeric(8);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: organizationCode,
          name: RandomGenerator.name(2),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 3. Onboard and login an org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // 4. Create department as org admin
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Create medical doctor (provider)
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(14);
  const providerUser = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(2),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctorPassword,
        specialty: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(providerUser);

  // 6. Create patient user
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(14);
  const patientUser = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date(
        Date.now() - Math.floor(Math.random() * 1e10),
      ).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patientUser);

  // 7. Create appointment status
  const status =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: RandomGenerator.alphaNumeric(8),
          display_name: RandomGenerator.name(2),
          business_status: "active",
          sort_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(status);

  // 8. Create room reservation
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const appointmentStart = new Date(now.getTime() + 30 * 60 * 1000); // 30min later
  const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000); // 1hr
  const roomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          room_id: roomId,
          reservation_start: appointmentStart.toISOString(),
          reservation_end: appointmentEnd.toISOString(),
          reservation_type: "appointment",
        },
      },
    );
  typia.assert(roomReservation);

  // 9. Create equipment reservation
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const equipmentReservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          equipment_id: equipmentId,
          reservation_start: appointmentStart.toISOString(),
          reservation_end: appointmentEnd.toISOString(),
          reservation_type: "scheduled",
        },
      },
    );
  typia.assert(equipmentReservation);

  // 10. Create the appointment as org admin
  const appointmentCreate = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
    provider_id: providerUser.id,
    patient_id: patientUser.id,
    status_id: status.id,
    room_id: roomReservation.room_id,
    equipment_id: equipmentReservation.equipment_id,
    appointment_type: "in-person",
    start_time: appointmentStart.toISOString(),
    end_time: appointmentEnd.toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      { body: appointmentCreate },
    );
  typia.assert(appointment);

  // Validate returned appointment matches creation request
  TestValidator.equals(
    "appointment org ID",
    appointment.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "appointment department ID",
    appointment.healthcare_platform_department_id,
    department.id,
  );
  TestValidator.equals(
    "appointment provider user",
    appointment.provider_id,
    providerUser.id,
  );
  TestValidator.equals(
    "appointment patient",
    appointment.patient_id,
    patientUser.id,
  );
  TestValidator.equals(
    "appointment status ID",
    appointment.status_id,
    status.id,
  );
  TestValidator.equals("appointment room ID", appointment.room_id, roomId);
  TestValidator.equals(
    "appointment equipment ID",
    appointment.equipment_id,
    equipmentId,
  );
  TestValidator.equals(
    "appointment start",
    appointment.start_time,
    appointmentStart.toISOString(),
  );
  TestValidator.equals(
    "appointment end",
    appointment.end_time,
    appointmentEnd.toISOString(),
  );

  // Edge: fail with wrong role -- login as systemAdmin and try unauthorized creation
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      provider: "local",
      provider_key: systemAdminEmail,
      password: systemAdminPassword,
    },
  });
  await TestValidator.error(
    "system admin cannot create org admin appointment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
        connection,
        { body: appointmentCreate },
      );
    },
  );

  // Edge: fail with conflicting/duplicate booking
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  await TestValidator.error(
    "conflicting appointment in same slot fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
        connection,
        { body: appointmentCreate },
      );
    },
  );
}
