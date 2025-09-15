import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Ensure a nurse can view and access the detail of a reminder directed to them,
 * but cannot view reminders for other nurses.
 *
 * 1. Register nurse A (join)
 * 2. Login as nurse A
 * 3. Create reminder with nurse A as target
 * 4. GET nurse A's reminder detail successfully
 * 5. Register nurse B
 * 6. Login as nurse B
 * 7. Attempt to GET nurse A's reminder detail as nurse B and expect error
 */
export async function test_api_reminder_detail_nurse_authorized_access(
  connection: api.IConnection,
) {
  // 1. Register nurse A
  const emailA = `${RandomGenerator.alphabets(8)}@hospital.com`;
  const nurseA = await api.functional.auth.nurse.join(connection, {
    body: {
      email: emailA as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      password: "Password123!",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseA);

  // 2. Login as nurse A
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: emailA as string & tags.Format<"email">,
      password: "Password123!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 3. Create reminder for nurse A
  const reminder =
    await api.functional.healthcarePlatform.nurse.reminders.create(connection, {
      body: {
        reminder_type: "compliance",
        reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
        scheduled_for: new Date(
          Date.now() + 1000 * 60 * 60,
        ).toISOString() as string & tags.Format<"date-time">,
        target_user_id: nurseA.id,
        status: "pending",
      } satisfies IHealthcarePlatformReminder.ICreate,
    });
  typia.assert(reminder);

  // 4. GET reminder detail as nurse A
  const detailA = await api.functional.healthcarePlatform.nurse.reminders.at(
    connection,
    {
      reminderId: reminder.id,
    },
  );
  typia.assert(detailA);
  TestValidator.equals(
    "reminder detail matches created",
    detailA,
    reminder,
    (key) => ["created_at", "updated_at"].includes(key),
  );

  // 5. Register nurse B
  const emailB = `${RandomGenerator.alphabets(8)}@hospital.com`;
  const nurseB = await api.functional.auth.nurse.join(connection, {
    body: {
      email: emailB as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      password: "AnotherPass456$",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseB);

  // 6. Login as nurse B
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: emailB as string & tags.Format<"email">,
      password: "AnotherPass456$",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 7. Nurse B attempts to access nurse A's reminder (should fail)
  await TestValidator.error(
    "unauthorized nurse cannot access other's reminder",
    async () => {
      await api.functional.healthcarePlatform.nurse.reminders.at(connection, {
        reminderId: reminder.id,
      });
    },
  );
}
