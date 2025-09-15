import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Receptionist successfully deletes an appointment reminder they created.
 *
 * Validates that a receptionist can register, log in, create a new appointment
 * and reminder, then delete (soft-remove) that reminder. Afterwards, verifies
 * that deletion returns the expected void/undefined response and that a second
 * deletion attempt with the same reminderId returns an error. All appointments
 * and reminders are generated with realistic random values using typia and
 * match DTO and API specs.
 *
 * 1. Receptionist joins with fixed password and email
 * 2. Receptionist logs in using these credentials
 * 3. Receptionist creates an appointment for an appropriately random patient
 * 4. Receptionist creates a reminder for that appointment, setting recipient to
 *    the appointment.patient_id and recipient_type="patient"
 * 5. Receptionist deletes the reminder successfully
 * 6. Attempting to delete with the same id again should result in an error
 */
export async function test_api_receptionist_reminder_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Receptionist creates account (register)
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // Step 2: Receptionist logs in with email and known password
  // (password not part of the schema, so assume workflow that accepts password used at registration)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Step 3: Receptionist creates an appointment
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const start_time = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const end_time = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
  const appointmentBody = {
    healthcare_platform_organization_id: orgId,
    provider_id: providerId,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time,
    end_time,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);
  TestValidator.equals(
    "appointment patient_id is as initialized",
    appointment.patient_id,
    patientId,
  );

  // Step 4: Receptionist creates appointment reminder
  const reminderBody = {
    reminder_time: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderBody,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder recipient_id is patient_id",
    reminder.recipient_id,
    appointment.patient_id,
  );

  // Step 5: Receptionist deletes the reminder
  const erased =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.erase(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  TestValidator.equals("erase returns void (undefined)", erased, undefined);

  // Step 6: Attempting to delete again returns error
  await TestValidator.error(
    "Deleting non-existent reminderId returns error",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
