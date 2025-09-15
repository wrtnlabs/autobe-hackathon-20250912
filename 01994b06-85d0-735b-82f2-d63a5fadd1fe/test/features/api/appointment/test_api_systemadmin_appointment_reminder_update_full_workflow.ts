import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Update an appointment reminder as a system admin (end-to-end).
 *
 * 1. Register a system admin (system setup, takes a random business email, name,
 *    password, etc)
 * 2. Log in as the system admin for API key/token acquisition
 * 3. Register a receptionist (random business email/name)
 * 4. Log in as the receptionist
 * 5. Receptionist creates an appointment (using random patient, provider, etc.)
 * 6. Switch back to system admin by logging in again
 * 7. System admin creates a reminder for the appointment
 * 8. System admin updates the reminder (change properties like delivery_channel,
 *    time)
 * 9. Validate response: updated field is changed, unmodified fields remain, ids
 *    are unchanged
 * 10. Error case: Try update with invalid (random) reminderId or appointmentId and
 *     ensure an error is thrown
 */
export async function test_api_systemadmin_appointment_reminder_update_full_workflow(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const sysadminEmail = `${RandomGenerator.alphaNumeric(10)}@corp-e2e.com`;
  const sysadminPW = RandomGenerator.alphaNumeric(16);
  const sysadminProvider = "local";
  const sysadmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysadminEmail,
        full_name: RandomGenerator.name(),
        provider: sysadminProvider,
        provider_key: sysadminEmail,
        password: sysadminPW,
      },
    });
  typia.assert(sysadmin);

  // 2. System admin login
  const sysadminLogin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysadminEmail,
        provider: sysadminProvider,
        provider_key: sysadminEmail,
        password: sysadminPW,
      },
    });
  typia.assert(sysadminLogin);

  // 3. Receptionist registration
  const receptionistEmail = `${RandomGenerator.alphaNumeric(10)}@hospital-e2e.com`;
  const receptionistPW = RandomGenerator.alphaNumeric(16);
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(receptionist);

  // 4. Receptionist login
  const receptionistLogin: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.login(connection, {
      body: {
        email: receptionistEmail,
        password: receptionistPW,
      },
    });
  typia.assert(receptionistLogin);

  // 5. Receptionist creates an appointment
  const appointmentCreate =
    typia.random<IHealthcarePlatformAppointment.ICreate>();
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);

  // 6. Switch to system admin again (ensure we have role for reminder endpoints)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: sysadminProvider,
      provider_key: sysadminEmail,
      password: sysadminPW,
    },
  });

  // 7. System admin creates reminder for the appointment
  const reminderCreate = {
    reminder_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour in the future
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderCreate,
      },
    );
  typia.assert(reminder);

  // 8. System admin updates the reminder (change delivery channel and time)
  const updateBody = {
    delivery_channel: "sms",
    reminder_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours in the future
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;
  const updatedReminder =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.update(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReminder);
  TestValidator.equals(
    "reminder id stays the same after update",
    updatedReminder.id,
    reminder.id,
  );
  TestValidator.notEquals(
    "reminder_time is updated",
    updatedReminder.reminder_time,
    reminder.reminder_time,
  );
  TestValidator.equals(
    "updated delivery_channel",
    updatedReminder.delivery_channel,
    updateBody.delivery_channel,
  );
  TestValidator.equals(
    "unchanged recipient_id",
    updatedReminder.recipient_id,
    reminder.recipient_id,
  );

  // 9. Error case: Try to update with invalid reminderId or appointmentId (should throw)
  await TestValidator.error("invalid reminderId throws error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.update(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: typia.random<string & tags.Format<"uuid">>(), // random invalid id
        body: updateBody,
      },
    );
  });

  await TestValidator.error("invalid appointmentId throws error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.update(
      connection,
      {
        appointmentId: typia.random<string & tags.Format<"uuid">>(), // random invalid id
        reminderId: reminder.id,
        body: updateBody,
      },
    );
  });
}
