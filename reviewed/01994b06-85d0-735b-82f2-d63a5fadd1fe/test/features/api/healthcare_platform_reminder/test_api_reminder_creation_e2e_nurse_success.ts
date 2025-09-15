import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * E2E test: nurse can create a reminder for another user.
 *
 * Steps:
 *
 * 1. Register (join) an initial nurse who will be the reminder creator.
 * 2. Login as this nurse to obtain authorization context.
 * 3. Register a second nurse who will be the 'target user' for the reminder.
 * 4. With the creator nurse authenticated, call the reminders API to create a
 *    reminder for the target nurse.
 * 5. Validate that the response is correct:
 *
 *    - Reminder is created (ID, schedule, message, recipient ID).
 *    - Reminder's target_user_id matches the second nurse's user ID.
 *    - Status and output are as expected.
 *    - All response fields are type-checked.
 */
export async function test_api_reminder_creation_e2e_nurse_success(
  connection: api.IConnection,
) {
  // 1. Register first nurse (reminder creator)
  const nurse1Email = typia.random<string & tags.Format<"email">>();
  const nurse1Password = RandomGenerator.alphaNumeric(12);
  const nurse1JoinBody = {
    email: nurse1Email,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    password: nurse1Password,
    specialty: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse1 = await api.functional.auth.nurse.join(connection, {
    body: nurse1JoinBody,
  });
  typia.assert(nurse1);

  // 2. Login as nurse1 for authentication
  const nurse1LoginBody = {
    email: nurse1Email,
    password: nurse1Password,
  } satisfies IHealthcarePlatformNurse.ILogin;
  const nurse1Auth = await api.functional.auth.nurse.login(connection, {
    body: nurse1LoginBody,
  });
  typia.assert(nurse1Auth);

  // 3. Register second nurse (reminder recipient)
  const nurse2Email = typia.random<string & tags.Format<"email">>();
  const nurse2JoinBody = {
    email: nurse2Email,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse2 = await api.functional.auth.nurse.join(connection, {
    body: nurse2JoinBody,
  });
  typia.assert(nurse2);

  // 4. Create reminder for nurse2 using nurse1's session
  const scheduleFor = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins from now
  const reminderCreateBody = {
    reminder_type: "compliance",
    reminder_message: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 14,
    }),
    scheduled_for: scheduleFor,
    target_user_id: nurse2.id,
    status: "pending",
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.nurse.reminders.create(connection, {
      body: reminderCreateBody,
    });
  typia.assert(reminder);

  // 5. Validate the response
  TestValidator.equals(
    "reminder target is nurse2 user id",
    reminder.target_user_id,
    nurse2.id,
  );
  TestValidator.equals(
    "reminder type",
    reminder.reminder_type,
    reminderCreateBody.reminder_type,
  );
  TestValidator.equals(
    "reminder message",
    reminder.reminder_message,
    reminderCreateBody.reminder_message,
  );
  TestValidator.equals(
    "reminder status is pending",
    reminder.status,
    "pending",
  );
  TestValidator.equals(
    "reminder scheduled_for",
    reminder.scheduled_for,
    scheduleFor,
  );
  TestValidator.predicate(
    "reminder created_at is valid date",
    typeof reminder.created_at === "string" && reminder.created_at.length > 0,
  );
}
