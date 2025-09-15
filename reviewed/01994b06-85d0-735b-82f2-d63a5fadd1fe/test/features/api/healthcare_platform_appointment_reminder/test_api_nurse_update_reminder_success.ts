import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * End-to-end scenario to validate that a nurse can update an appointment
 * reminder on the Healthcare Platform API.
 *
 * Steps:
 *
 * 1. Register (join) a nurse with random credentials (including business email,
 *    legal name, license number, password)
 * 2. Login as the nurse to establish an authenticated session
 * 3. Prepare random valid UUIDs for appointmentId and reminderId, and a random
 *    recipient_id
 * 4. Construct a valid update payload
 *    (IHealthcarePlatformAppointmentReminder.IUpdate)
 * 5. Call the update API endpoint for the reminder
 * 6. Assert response type and that updated fields match the update payload
 */
export async function test_api_nurse_update_reminder_success(
  connection: api.IConnection,
) {
  // 1. Register nurse (join)
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@clinic-hospital.com`,
    full_name: RandomGenerator.name(2),
    license_number: RandomGenerator.alphaNumeric(10),
    password,
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });
  typia.assert(nurse);

  // 2. Nurse login
  const loginBody = {
    email: joinBody.email,
    password,
  } satisfies IHealthcarePlatformNurse.ILogin;
  const nurseSession = await api.functional.auth.nurse.login(connection, {
    body: loginBody,
  });
  typia.assert(nurseSession);

  // 3. Prepare random IDs for appointment and reminder
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const reminderId = typia.random<string & tags.Format<"uuid">>();
  const newRecipientId = typia.random<string & tags.Format<"uuid">>();

  // 4. Construct update payload
  const updatePayload = {
    recipient_id: newRecipientId,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
    delivery_status: RandomGenerator.pick([
      "pending",
      "sent",
      "failed",
    ] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;

  // 5. Call update API
  const updatedReminder =
    await api.functional.healthcarePlatform.nurse.appointments.reminders.update(
      connection,
      {
        appointmentId,
        reminderId,
        body: updatePayload,
      },
    );
  typia.assert(updatedReminder);

  // 6. Validate that the returned reminder reflects the update
  TestValidator.equals(
    "updated recipient_id matches",
    updatedReminder.recipient_id,
    updatePayload.recipient_id,
  );
  TestValidator.equals(
    "updated delivery_channel matches",
    updatedReminder.delivery_channel,
    updatePayload.delivery_channel,
  );
  TestValidator.equals(
    "updated delivery_status matches",
    updatedReminder.delivery_status,
    updatePayload.delivery_status,
  );
}
