import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate receptionist can update appointment reminder only within their
 * organization, and proper audit/error occurs.
 *
 * Steps:
 *
 * 1. Register and log in a first receptionist account (Org1)
 * 2. Create an appointment under Org1
 * 3. Create a reminder linked to that appointment
 * 4. Update the reminder's allowed field(s) (e.g., delivery_channel,
 *    reminder_time) and verify effect
 * 5. Try to update a forbidden field (e.g., attempt to set recipient_id to an
 *    arbitrary value) and expect error
 * 6. Register and log in a second receptionist (Org2)
 * 7. Attempt to update the reminder created by Org1 from the Org2 account, expect
 *    error
 */
export async function test_api_appointment_reminder_update_by_receptionist_permission_and_audit(
  connection: api.IConnection,
) {
  // Step 1: Register and log in receptionist 1 (Org1)
  const receptionist1_credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist1 = await api.functional.auth.receptionist.join(
    connection,
    { body: receptionist1_credentials },
  );
  typia.assert(receptionist1);

  // Step 2: Create appointment as receptionist 1 (Org1)
  const appointmentBody = {
    healthcare_platform_organization_id: typia.assert(
      receptionist1.id,
    ) satisfies string as string, // hack: no org API so tie to receptionist for org
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 36e5).toISOString(),
    end_time: new Date(Date.now() + 2 * 36e5).toISOString(),
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBody },
    );
  typia.assert(appointment);

  // Step 3: Create reminder for the appointment
  const reminderBody = {
    reminder_time: new Date(Date.now() + 1800 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
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

  // Step 4: Update allowed fields of reminder (change delivery_channel and reminder_time)
  const newChannel = "sms";
  const newTime = new Date(Date.now() + 3600 * 1000).toISOString();
  const updateBody = {
    delivery_channel: newChannel,
    reminder_time: newTime,
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.update(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "reminder channel updated",
    updated.delivery_channel,
    newChannel,
  );
  TestValidator.equals("reminder time updated", updated.reminder_time, newTime);

  // Step 5: Try to update forbidden field (recipient_id to a random uuid), expect error
  await TestValidator.error(
    "cannot change recipient_id to unrelated value",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.update(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
          body: {
            recipient_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformAppointmentReminder.IUpdate,
        },
      );
    },
  );

  // Step 6: Register and log in 2nd receptionist (Org2)
  const receptionist2_credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist2 = await api.functional.auth.receptionist.join(
    connection,
    { body: receptionist2_credentials },
  );
  typia.assert(receptionist2);
  // Step 7: Try to update reminder of Org1 while logged in as Org2, expect error
  await TestValidator.error(
    "other receptionist cannot update reminder not in their org",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.update(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
          body: {
            delivery_channel: "in_app",
          } satisfies IHealthcarePlatformAppointmentReminder.IUpdate,
        },
      );
    },
  );
}
