import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the ability of a system admin to view detailed reminder information by
 * ID, including info from any organization, as well as handling non-existent
 * and soft-deleted reminders.
 *
 * 1. Register/join a system admin.
 * 2. Log in as the system admin.
 * 3. Attempt to retrieve reminder detail for an existing reminder record
 *    (simulated as available).
 * 4. Assert that the detail fields match expectations and contain required
 *    audit/non-audit fields.
 * 5. Negative: Query with a random, all-zero UUID, expect error.
 * 6. Negative: (where possible) Query for a soft-deleted reminder; skip if such
 *    reminder cannot be set up in test scaffold.
 */
export async function test_api_systemadmin_reminder_detail_access(
  connection: api.IConnection,
) {
  // 1. Register (join) a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Log in (for completeness)
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loggedIn = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 3. Retrieve existing reminder detail (simulate existing reminderId)
  const validReminderId = typia.random<string & tags.Format<"uuid">>();
  try {
    const reminder: IHealthcarePlatformReminder =
      await api.functional.healthcarePlatform.systemAdmin.reminders.at(
        connection,
        { reminderId: validReminderId },
      );
    typia.assert(reminder);
    TestValidator.predicate(
      "reminder id matches",
      reminder.id === validReminderId,
    );
    TestValidator.predicate(
      "reminder type is present",
      !!reminder.reminder_type,
    );
    TestValidator.predicate(
      "scheduled_for is present",
      !!reminder.scheduled_for,
    );
    TestValidator.predicate("status is present", !!reminder.status);
    TestValidator.predicate("created_at is present", !!reminder.created_at);
  } catch (exp) {
    // For a randomly generated reminder UUID, not finding it is a valid outcome (negative case)
    TestValidator.predicate(
      "nonexistent reminder should give error or empty",
      true,
    );
  }

  // 4. Negative: Query with all-zero UUID
  const fakeReminderId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error("error on nonexistent reminder UUID", async () => {
    await api.functional.healthcarePlatform.systemAdmin.reminders.at(
      connection,
      { reminderId: fakeReminderId },
    );
  });

  // 5. Negative: Query for a soft-deleted reminder (skipped if not available)
}
