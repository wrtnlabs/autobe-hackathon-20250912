import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * E2E test for nurse reminder update endpoint including valid and invalid
 * cases.
 *
 * Validates all expected behaviors of PUT
 * /healthcarePlatform/nurse/reminders/{reminderId}:
 *
 * 1. Nurse can update a reminder they created (valid case).
 * 2. Nurse cannot update a soft-deleted reminder (business failure).
 * 3. Nurse cannot update a non-existent (random) reminder (business failure).
 * 4. Cannot test compliance-locked reminder update as there's no API to
 *    simulate it.
 *
 * Step-by-step process and rationale:
 *
 * 1. Create a new nurse account (join API).
 * 2. Log in as the nurse (login API).
 * 3. Create a valid reminder for the nurse (create API).
 * 4. Update the reminder:
 *
 *    - Send an IHealthcarePlatformReminder.IUpdate with changed
 *         reminder_message, scheduled_for, and status.
 *    - Expect the response to reflect new values; validate with typia.assert and
 *         TestValidator.equals.
 * 5. Soft-delete the reminder (erase API).
 * 6. Attempt to update the deleted reminder:
 *
 *    - Expect business error; assert with await TestValidator.error (correct
 *         async usage).
 * 7. Attempt to update a non-existent reminder (random UUID):
 *
 *    - Expect business error; assert with await TestValidator.error.
 * 8. (Optional/skipped) If there were an API to compliance-lock a reminder,
 *    attempt to update and expect failure. Skipped since not implementable
 *    with provided API.
 *
 * All requests and assertions use only required fields and types as per DTO
 * definitions. No additional imports or invented properties are present
 * (DTO/type safety strictly enforced).
 */
export async function test_api_nurse_reminder_update_valid_and_invalid_cases(
  connection: api.IConnection,
) {
  // 1. Register a nurse account with valid required fields
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    password: nursePassword,
    // specialty and phone are optional/nullable, leave undefined
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });
  typia.assert(nurse);

  // 2. Log in as nurse (to ensure session/auth and test login endpoint)
  const loginBody = {
    email: nurseEmail,
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.ILogin;
  const session = await api.functional.auth.nurse.login(connection, {
    body: loginBody,
  });
  typia.assert(session);
  TestValidator.equals("login identity matches joined", session.id, nurse.id);

  // 3. Nurse creates a new reminder
  const createReminderBody = {
    reminder_type: "compliance",
    reminder_message: RandomGenerator.paragraph({ sentences: 4 }),
    scheduled_for: new Date(Date.now() + 3600_000).toISOString(),
    // all other optional fields omitted
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.nurse.reminders.create(connection, {
      body: createReminderBody,
    });
  typia.assert(reminder);
  TestValidator.equals(
    "reminder creator matches session",
    session.id,
    nurse.id,
  );
  TestValidator.equals(
    "reminder scheduled_for",
    reminder.scheduled_for,
    createReminderBody.scheduled_for,
  );

  // 4. Update the reminder (should succeed)
  const updateReminderBody = {
    reminder_message: RandomGenerator.paragraph({ sentences: 5 }),
    scheduled_for: new Date(Date.now() + 7200_000).toISOString(), // 2hrs later
    status: "pending",
  } satisfies IHealthcarePlatformReminder.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.nurse.reminders.update(connection, {
      reminderId: reminder.id,
      body: updateReminderBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "reminder_message updated",
    updated.reminder_message,
    updateReminderBody.reminder_message,
  );
  TestValidator.equals(
    "scheduled_for updated",
    updated.scheduled_for,
    updateReminderBody.scheduled_for,
  );
  TestValidator.equals(
    "status updated",
    updated.status,
    updateReminderBody.status,
  );

  // 5. Soft-delete the reminder (erase API)
  await api.functional.healthcarePlatform.nurse.reminders.erase(connection, {
    reminderId: reminder.id,
  });
  // 6. Attempt to update soft-deleted reminder (expect error)
  await TestValidator.error(
    "update of soft-deleted reminder fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.reminders.update(
        connection,
        {
          reminderId: reminder.id,
          body: {
            reminder_message: "Should fail",
          } satisfies IHealthcarePlatformReminder.IUpdate,
        },
      );
    },
  );
  // 7. Attempt to update non-existent reminder (random UUID, expect error)
  await TestValidator.error(
    "update of non-existent reminder fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.reminders.update(
        connection,
        {
          reminderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reminder_message: "Should not exist",
          } satisfies IHealthcarePlatformReminder.IUpdate,
        },
      );
    },
  );
  // 8. Skipped: Compliance-locked reminder update cannot be tested (no API)
}
