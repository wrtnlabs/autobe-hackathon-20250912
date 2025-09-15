import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate retrieval of appointment reminder details by an assigned medical
 * doctor, and rejection for unassigned doctors.
 *
 * 1. Register an organization admin and log in.
 * 2. Register two separate medical doctor users and log them in as needed.
 * 3. Create (as org admin) an appointment for doctor A (the target doctor) and a
 *    second appointment for doctor B.
 * 4. Switch to doctor A and create a reminder for his appointment.
 * 5. Switch to doctor B and create a reminder for their appointment.
 * 6. Switch back to doctor A. Attempt to retrieve his reminder (should succeed)
 *    and doctor B's reminder (should fail as forbidden).
 * 7. Ensure returned data includes correct reminder fields for the happy path, and
 *    forbidden error for the negative.
 */
export async function test_api_appointment_reminder_retrieval_by_medical_doctor(
  connection: api.IConnection,
) {
  // 1. Organization Admin Registration + Login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "adminPass123!",
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(orgAdmin);
  const organizationId = typia.random<string & tags.Format<"uuid">>(); // Will use for appointments

  // 2. Register Doctor A
  const doctorAEmail = typia.random<string & tags.Format<"email">>();
  const doctorA_npi = RandomGenerator.alphaNumeric(10);
  const doctorA: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorAEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorA_npi,
        password: "docAPass123!",
        specialty: "family_medicine",
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(doctorA);

  // 3. Register Doctor B
  const doctorBEmail = typia.random<string & tags.Format<"email">>();
  const doctorB_npi = RandomGenerator.alphaNumeric(10);
  const doctorB: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorBEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorB_npi,
        password: "docBPass123!",
        specialty: "internal_medicine",
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(doctorB);

  // 4. As OrgAdmin: Create Appointment for DoctorA
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: "adminPass123!" },
  });
  const appointmentA: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId,
          provider_id: doctorA.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          end_time: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(appointmentA);

  // 5. As OrgAdmin: Create Appointment for DoctorB
  const appointmentB: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId,
          provider_id: doctorB.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
          end_time: new Date(Date.now() + 1000 * 60 * 60 * 27).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(appointmentB);

  // 6. Switch to Doctor A, login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorAEmail, password: "docAPass123!" },
  });

  // 7. Create a reminder for appointment A as Doctor A
  const reminderBodyA = {
    reminder_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    recipient_type: "provider",
    recipient_id: doctorA.id,
    delivery_channel: "email",
  };
  const reminderA: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
      connection,
      {
        appointmentId: appointmentA.id,
        body: reminderBodyA,
      },
    );
  typia.assert(reminderA);

  // 8. Switch to Doctor B, login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorBEmail, password: "docBPass123!" },
  });

  // 9. Create a reminder for appointment B as Doctor B
  const reminderBodyB = {
    reminder_time: new Date(Date.now() + 1000 * 60 * 35).toISOString(),
    recipient_type: "provider",
    recipient_id: doctorB.id,
    delivery_channel: "sms",
  };
  const reminderB: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
      connection,
      {
        appointmentId: appointmentB.id,
        body: reminderBodyB,
      },
    );
  typia.assert(reminderB);

  // 10. Switch back to Doctor A
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorAEmail, password: "docAPass123!" },
  });

  // 11. Happy path: Doctor A retrieves his reminder
  const retrieved: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.at(
      connection,
      {
        appointmentId: appointmentA.id,
        reminderId: reminderA.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "reminder belongs to correct appointment",
    retrieved.appointment_id,
    appointmentA.id,
  );
  TestValidator.equals("reminder id matches", retrieved.id, reminderA.id);
  TestValidator.equals(
    "reminder recipient matches doctor",
    retrieved.recipient_id,
    doctorA.id,
  );
  TestValidator.equals(
    "delivery channel returned",
    retrieved.delivery_channel,
    reminderBodyA.delivery_channel,
  );

  // 12. Negative path: Doctor A tries to access Doctor B's reminder (should fail)
  await TestValidator.error(
    "doctor not assigned cannot access unrelated reminder",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.at(
        connection,
        {
          appointmentId: appointmentB.id,
          reminderId: reminderB.id,
        },
      );
    },
  );
}
