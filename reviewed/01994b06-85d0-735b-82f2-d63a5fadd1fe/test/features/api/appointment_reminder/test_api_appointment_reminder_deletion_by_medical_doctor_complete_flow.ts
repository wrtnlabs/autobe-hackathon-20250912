import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Full end-to-end workflow for deleting an appointment reminder as a medical
 * doctor.
 *
 * The workflow includes:
 *
 * 1. System admin registration & login
 * 2. Organization creation by system admin
 * 3. Organization admin registration & login
 * 4. Department creation in organization
 * 5. Medical doctor registration & login
 * 6. Appointment creation by doctor
 * 7. Appointment reminder creation by doctor
 * 8. Deletion of the appointment reminder by doctor (success case)
 * 9. Deletion attempt by medical doctor of a non-existent/reminder-deleted ID
 *    (should error)
 * 10. Deletion attempt by a non-authorized user (should error)
 */
export async function test_api_appointment_reminder_deletion_by_medical_doctor_complete_flow(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });
  typia.assert(sysadmin);

  // 2. System admin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });

  // 3. Organization creation
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name();
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 4. Organization admin registration
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
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
  typia.assert(orgAdmin);

  // 5. Organization admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // 6. Department creation
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

  // 7. Medical doctor registration
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPassword,
      specialty: "General Practice",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctor);

  // 8. Medical doctor login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 9. Appointment creation
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctor.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          room_id: null,
          equipment_id: null,
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 60000).toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          recurrence_rule: null,
        },
      },
    );
  typia.assert(appointment);

  // 10. Reminder creation
  const reminder =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: new Date(Date.now() + 30000).toISOString(),
          recipient_type: "provider",
          recipient_id: doctor.id,
          delivery_channel: "email",
        },
      },
    );
  typia.assert(reminder);

  // 11. Reminder deletion by the doctor
  await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.erase(
    connection,
    {
      appointmentId: appointment.id,
      reminderId: reminder.id,
    },
  );

  // 12. Attempt to delete the same reminder again (should fail - non-existent)
  await TestValidator.error(
    "deleting a non-existent reminder should error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );

  // 13. Create another medical doctor for unauthorized test
  const otherDoctorEmail = typia.random<string & tags.Format<"email">>();
  const otherDoctorPassword = RandomGenerator.alphaNumeric(12);
  const otherDoctorNpi = RandomGenerator.alphaNumeric(10);
  const otherDoctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: otherDoctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: otherDoctorNpi,
      password: otherDoctorPassword,
      specialty: "General Practice",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(otherDoctor);

  // 14. Login as the second doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: otherDoctorEmail,
      password: otherDoctorPassword,
    },
  });

  // 15. Attempt to delete first doctor's reminder as other doctor (should error)
  await TestValidator.error(
    "only original doctor can delete their reminder",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
