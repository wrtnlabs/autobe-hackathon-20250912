import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Test delete appointment reminder as nurse, checking for role scope
 * enforcement and data integrity
 *
 * Steps:
 *
 * 1. Register a nurse (with unique business email), and login for session.
 * 2. Generate a random appointmentId (simulate as we cannot create real
 *    appointments in nurse scope).
 * 3. Create an appointment reminder as nurse for this appointment (capture
 *    reminderId).
 * 4. Delete the reminder successfully.
 * 5. Attempt to delete same reminder again (should fail: already deleted).
 * 6. Try deleting a random (non-existent) reminder for the same appointment
 *    (should fail: not found or disallowed).
 * 7. Validate all error conditions cause errors, not silent success.
 */
export async function test_api_delete_appointment_reminder_nurse_role_scope_and_data_integrity(
  connection: api.IConnection,
) {
  // 1. Register and login nurse
  const nurse_email = `nurse_${RandomGenerator.alphaNumeric(8)}@clinic-example.com`;
  const nurse_password = "Password123!";
  const join_output = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse_email,
      password: nurse_password,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "ICU",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(join_output);

  // Ensure login (mainly redundant as join sets auth, but for completeness)
  const login_output = await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  typia.assert(login_output);

  // 2. Fake existing appointmentId (simulate - as nurse cannot create appointment)
  const appointmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a reminder for that appointment
  const reminder_body = {
    reminder_time: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
    recipient_type: "patient",
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    delivery_channel: RandomGenerator.pick(["sms", "email", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.nurse.appointments.reminders.create(
      connection,
      {
        appointmentId,
        body: reminder_body,
      },
    );
  typia.assert(reminder);

  // 4. Delete the reminder successfully
  await api.functional.healthcarePlatform.nurse.appointments.reminders.erase(
    connection,
    {
      appointmentId,
      reminderId: reminder.id,
    },
  );

  // 5. Attempt to delete again (should fail)
  await TestValidator.error(
    "deleting already deleted reminder fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.reminders.erase(
        connection,
        {
          appointmentId,
          reminderId: reminder.id,
        },
      );
    },
  );

  // 6. Attempt to delete a random (non-existent) reminder
  await TestValidator.error(
    "deleting non-existent reminder fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.reminders.erase(
        connection,
        {
          appointmentId,
          reminderId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
