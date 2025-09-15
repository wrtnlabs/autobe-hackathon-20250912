import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validates that a patient can only update their own appointment reminders, and
 * only permitted fields.
 *
 * Business context: Insures privacy and integrity of appointment reminders in a
 * multi-patient, multi-role system.
 *
 * Steps:
 *
 * 1. Register and log in a receptionist (to book the appointment).
 * 2. Register and log in Patient-A.
 * 3. Receptionist books an appointment for Patient-A.
 * 4. Patient-A creates a reminder for their appointment.
 * 5. Patient-A successfully updates their reminder (allowed field:
 *    delivery_status).
 * 6. Patient-A attempts to update restricted field (recipient_id): must be
 *    rejected.
 * 7. Patient-B is registered and logged in.
 * 8. Patient-B attempts to update Patient-A's reminder: must be rejected.
 */
export async function test_api_appointment_reminder_update_by_patient_success_and_restrictions(
  connection: api.IConnection,
) {
  // Receptionist joins and logs in
  const receptionistEmail = RandomGenerator.alphaNumeric(10) + "@clinic.com";
  const receptionistPassword = "Receptionist123$";
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
      password: receptionistPassword,
    },
  });

  // Patient-A joins and logs in
  const patientAEmail = RandomGenerator.alphaNumeric(10) + "@patients.com";
  const patientAPassword = "Patient123!";
  const patientA = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientAEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientAPassword,
    },
  });
  typia.assert(patientA);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAEmail,
      password: patientAPassword,
    },
  });

  // Book appointment by receptionist for patient-A
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      password: receptionistPassword,
    },
  });
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          healthcare_platform_department_id: undefined,
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patientA.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          end_time: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          room_id: undefined,
          equipment_id: undefined,
          recurrence_rule: undefined,
        },
      },
    );
  typia.assert(appointment);

  // Patient-A logs back in
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAEmail,
      password: patientAPassword,
    },
  });

  // Patient-A creates reminder for their appointment
  const reminder =
    await api.functional.healthcarePlatform.patient.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
          recipient_type: "patient",
          recipient_id: patientA.id,
          delivery_channel: RandomGenerator.pick([
            "email",
            "sms",
            "in_app",
          ] as const),
        },
      },
    );
  typia.assert(reminder);

  // 1. Allowed update: Patient updates delivery_status
  const updatedReminder =
    await api.functional.healthcarePlatform.patient.appointments.reminders.update(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
        body: { delivery_status: "sent" },
      },
    );
  typia.assert(updatedReminder);
  TestValidator.equals(
    "Patient can update allowed reminder field (delivery_status)",
    updatedReminder.delivery_status,
    "sent",
  );

  // 2. Forbidden update: Patient attempts to change recipient_id (should fail)
  await TestValidator.error(
    "Patient cannot update appointment reminder recipient_id",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.reminders.update(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
          body: { recipient_id: typia.random<string & tags.Format<"uuid">>() },
        },
      );
    },
  );

  // Patient-B joins and logs in
  const patientBEmail = RandomGenerator.alphaNumeric(10) + "@patients.com";
  const patientBPassword = "Patient456!";
  const patientB = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientBEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1991, 2, 2).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientBPassword,
    },
  });
  typia.assert(patientB);

  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBEmail,
      password: patientBPassword,
    },
  });

  // 3. Patient-B attempts to update Patient-A's reminder (should fail)
  await TestValidator.error(
    "Patient cannot update another patient's appointment reminder",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.reminders.update(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
          body: { delivery_status: "failed" },
        },
      );
    },
  );
}
