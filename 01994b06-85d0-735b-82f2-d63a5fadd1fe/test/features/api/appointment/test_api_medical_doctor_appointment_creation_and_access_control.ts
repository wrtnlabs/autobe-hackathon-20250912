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
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end appointment creation and access control for medical doctor.
 *
 * Validates:
 *
 * - Multi-role auth (system admin, org admin, doctor, patient)
 * - Necessary business references (organization, department, appointment status,
 *   resources)
 * - Doctor's scope boundaries (can only create for their own org/department,
 *   cannot assign another provider)
 * - Resource existence and relationship validation
 * - Both positive and negative (denied) creation attempts
 */
export async function test_api_medical_doctor_appointment_creation_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 2. System admin creates an organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 3. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // 4. Org admin creates a department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Org admin creates appointment status
  const apptStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: RandomGenerator.alphaNumeric(6),
          display_name: RandomGenerator.name(),
          sort_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(apptStatus);

  // 6. Org admin provisions room and equipment reservations
  // Room reservation
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const reservationStart = new Date(Date.now() + 60_000).toISOString(); // 1min in future
  const reservationEnd = new Date(Date.now() + 3600_000).toISOString(); // 1hr in future

  const roomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          room_id: roomId,
          reservation_start: reservationStart,
          reservation_end: reservationEnd,
          reservation_type: "appointment",
        },
      },
    );
  typia.assert(roomReservation);

  // Equipment reservation
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const equipmentReservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          equipment_id: equipmentId,
          reservation_start: reservationStart,
          reservation_end: reservationEnd,
          reservation_type: "appointment",
        },
      },
    );
  typia.assert(equipmentReservation);

  // 7. Register as medical doctor attached to org/department
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPassword,
    },
  });
  typia.assert(doctor);

  // 8. Login as this doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 9. Register as patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // 10. Positive: Doctor creates appointment (all valid references)
  const startTime = new Date(Date.now() + 2 * 60_000).toISOString();
  const endTime = new Date(Date.now() + 3 * 60_000).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctor.id,
          patient_id: patient.id,
          status_id: apptStatus.id,
          room_id: roomReservation.room_id,
          equipment_id: equipmentReservation.equipment_id,
          appointment_type: "in-person",
          start_time: startTime,
          end_time: endTime,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(appointment);
  TestValidator.equals(
    "created appointment org",
    appointment.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "created appointment provider id",
    appointment.provider_id,
    doctor.id,
  );
  TestValidator.equals(
    "created appointment patient id",
    appointment.patient_id,
    patient.id,
  );

  // 11. Negative: Doctor tries to create appointment with another provider (should fail)
  const otherDoctorEmail = typia.random<string & tags.Format<"email">>();
  const otherDoctorPassword = RandomGenerator.alphaNumeric(12);
  const otherDoctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: otherDoctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: otherDoctorPassword,
    },
  });
  typia.assert(otherDoctor);

  await TestValidator.error(
    "doctor cannot assign another provider for appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            healthcare_platform_department_id: department.id,
            provider_id: otherDoctor.id,
            patient_id: patient.id,
            status_id: apptStatus.id,
            room_id: roomReservation.room_id,
            equipment_id: equipmentReservation.equipment_id,
            appointment_type: "in-person",
            start_time: startTime,
            end_time: endTime,
          },
        },
      );
    },
  );

  // 12. Negative: Doctor tries to create appointment for a department/org not their own (should fail)
  // Create another organization and department
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  const badOrg =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(badOrg);
  // As org admin, create a new department in bad org
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  const badDepartment =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: badOrg.id,
        body: {
          healthcare_platform_organization_id: badOrg.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(badDepartment);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });
  await TestValidator.error(
    "doctor cannot create appointment for department they do not belong to",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: badOrg.id,
            healthcare_platform_department_id: badDepartment.id,
            provider_id: doctor.id,
            patient_id: patient.id,
            status_id: apptStatus.id,
            room_id: roomReservation.room_id,
            equipment_id: equipmentReservation.equipment_id,
            appointment_type: "in-person",
            start_time: startTime,
            end_time: endTime,
          },
        },
      );
    },
  );

  // 14. Negative: Reference to non-existent status
  await TestValidator.error(
    "doctor cannot create appointment with non-existent status id",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            healthcare_platform_department_id: department.id,
            provider_id: doctor.id,
            patient_id: patient.id,
            status_id: typia.random<string & tags.Format<"uuid">>(),
            room_id: roomReservation.room_id,
            equipment_id: equipmentReservation.equipment_id,
            appointment_type: "in-person",
            start_time: startTime,
            end_time: endTime,
          },
        },
      );
    },
  );
}
