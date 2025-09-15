import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate successful soft-delete of receptionist's reminder record.
 *
 * 1. Register a receptionist account (with random email and details)
 * 2. Login as this receptionist, setting password at login time (schema allows
 *    password only at login, not join)
 * 3. Create a reminder (with session user; scheduled one minute ahead)
 * 4. Delete this created reminder using current session
 * 5. Validate operation completes with no error
 * 6. Listing/read endpoints aren't available so soft-delete is tested by
 *    successful completion only.
 */
export async function test_api_receptionist_reminder_delete_success(
  connection: api.IConnection,
) {
  // 1. Register receptionist account (schema: no password on join)
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const receptionistPhone = RandomGenerator.mobile();
  await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: receptionistFullName,
      phone: receptionistPhone,
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });

  // 2. Login as this receptionist with fixed password (password only provided in login API, not on join)
  const testPassword = "test-password-1234";
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: testPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Create a reminder (schedule one minute from now)
  const now = new Date();
  const scheduleFor = new Date(now.getTime() + 60_000).toISOString();
  const createReminderBody = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: scheduleFor,
    target_user_id: null,
    organization_id: null,
  } satisfies IHealthcarePlatformReminder.ICreate;

  const reminder =
    await api.functional.healthcarePlatform.receptionist.reminders.create(
      connection,
      {
        body: createReminderBody,
      },
    );
  typia.assert(reminder);

  // 4. Delete the reminder by ID (soft delete)
  await api.functional.healthcarePlatform.receptionist.reminders.erase(
    connection,
    {
      reminderId: reminder.id,
    },
  );
  // 5-6. No fetch/list endpoint for reminders, so success is lack of error and operation completes.
}
