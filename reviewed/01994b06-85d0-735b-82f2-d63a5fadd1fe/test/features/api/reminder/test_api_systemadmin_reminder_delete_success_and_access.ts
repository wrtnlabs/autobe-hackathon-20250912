import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test covering reminder deletion through healthcare platform
 * system admin context.
 *
 * Steps:
 *
 * 1. Register and log in as system admin (with unique email, password, and
 *    required profile data).
 * 2. Create a reminder as system admin (use current/future date as
 *    scheduled_for, and random message/type).
 * 3. Soft-delete the created reminder with DELETE
 *    /healthcarePlatform/systemAdmin/reminders/:reminderId.
 * 4. Confirm successful deletion by checking the returned value (would be
 *    void, deletion is verified via subsequent behavior).
 * 5. Negative test: Attempt to soft-delete a non-existent reminderId.
 * 6. Negative test: After deletion, attempt to delete or update the same
 *    reminder again (should result in business validation error).
 * 7. (Audit business log is not directly accessible in this test)
 *
 * Notes:
 *
 * - Organization scope test (try deleting another org's reminder) is omitted
 *   since no org context endpoints/DTOs are provided for cross-org
 *   creation.
 * - Only DTOs and API functions as provided are used. No invalid type test
 *   cases.
 * - Post deletion, the resource is presumed inaccessible to update/delete
 *   (per business logic enforcement).
 */
export async function test_api_systemadmin_reminder_delete_success_and_access(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginBody = {
    email: joinBody.email,
    provider: "local",
    provider_key: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminLogin);

  // 3. Create a new reminder
  const now = new Date();
  const reminderCreateBody = {
    reminder_type: RandomGenerator.paragraph({ sentences: 2 }),
    reminder_message: RandomGenerator.paragraph({ sentences: 6 }),
    scheduled_for: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      { body: reminderCreateBody },
    );
  typia.assert(reminder);

  // 4. Successful DELETE
  await api.functional.healthcarePlatform.systemAdmin.reminders.erase(
    connection,
    { reminderId: reminder.id },
  );

  // 5. Negative test: delete non-existent id
  await TestValidator.error("delete non-existent reminder fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.reminders.erase(
      connection,
      { reminderId: typia.random<string & tags.Format<"uuid">>() },
    );
  });

  // 6. Negative test: delete again after soft-delete
  await TestValidator.error("delete soft-deleted reminder fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.reminders.erase(
      connection,
      { reminderId: reminder.id },
    );
  });
  // 7. Negative test: update after deletion (update endpoint not present, so skipped)
}
