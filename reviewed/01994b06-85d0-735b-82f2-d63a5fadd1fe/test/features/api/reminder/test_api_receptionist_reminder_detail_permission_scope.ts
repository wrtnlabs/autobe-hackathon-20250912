import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate receptionist can view details for their assigned reminders, and not
 * for others.
 *
 * End-to-end scenario:
 *
 * 1. Register and log in Receptionist A (owns the reminder).
 * 2. Register and log in Receptionist B (other user for negative test).
 * 3. Register and log in System Admin.
 * 4. System Admin creates a reminder for Receptionist A.
 * 5. Receptionist A fetches their reminder by ID (success, all fields present).
 * 6. Receptionist B attempts to fetch the reminder for Receptionist A (should
 *    fail: forbidden/not found).
 * 7. Receptionist A attempts to fetch a non-existent reminder (should fail).
 */
export async function test_api_receptionist_reminder_detail_permission_scope(
  connection: api.IConnection,
) {
  // 1. Register Receptionist A
  const receptionistAEmail = typia.random<string & tags.Format<"email">>();
  const receptionistAPassword = RandomGenerator.alphaNumeric(12);
  const receptionistAJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistAJoin);

  // 2. Register Receptionist B
  const receptionistBEmail = typia.random<string & tags.Format<"email">>();
  const receptionistBPassword = RandomGenerator.alphaNumeric(12);
  const receptionistBJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistBJoin);

  // 3. Register & login as System Admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // Login again as System Admin to set session (not always needed but robust for role-switching)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 4. System Admin creates a reminder for Receptionist A
  const reminderReq = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph(),
    scheduled_for: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10min in future
    target_user_id: receptionistAJoin.id,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      { body: reminderReq },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder targeted to receptionistA",
    reminder.target_user_id,
    receptionistAJoin.id,
  );

  // 5. Receptionist A logs in and fetches own reminder
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistAEmail,
      password: receptionistAPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  const fetched =
    await api.functional.healthcarePlatform.receptionist.reminders.at(
      connection,
      {
        reminderId: reminder.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("fetched reminder id matches", fetched.id, reminder.id);
  TestValidator.equals(
    "fetched reminder target matches",
    fetched.target_user_id,
    receptionistAJoin.id,
  );
  TestValidator.equals(
    "fetched type matches",
    fetched.reminder_type,
    reminderReq.reminder_type,
  );
  TestValidator.equals(
    "fetched message matches",
    fetched.reminder_message,
    reminderReq.reminder_message,
  );
  TestValidator.equals(
    "fetched scheduled_for matches",
    fetched.scheduled_for,
    reminderReq.scheduled_for,
  );

  // 6. Receptionist B attempts to fetch Receptionist A's reminder (should fail)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistBEmail,
      password: receptionistBPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error(
    "other receptionist cannot access another's reminder",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.at(
        connection,
        {
          reminderId: reminder.id,
        },
      );
    },
  );

  // 7. Receptionist A attempts to fetch non-existent reminder
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistAEmail,
      password: receptionistAPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error("cannot fetch non-existent reminder", async () => {
    await api.functional.healthcarePlatform.receptionist.reminders.at(
      connection,
      {
        reminderId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
