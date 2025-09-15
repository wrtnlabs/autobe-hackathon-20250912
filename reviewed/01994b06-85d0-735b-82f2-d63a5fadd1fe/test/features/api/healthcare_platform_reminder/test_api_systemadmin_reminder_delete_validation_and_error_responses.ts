import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate error and access control handling when deleting reminders as a
 * system admin.
 *
 * This test covers authorization, business rules, and validation for the
 * reminder delete endpoint:
 *
 * 1. Register a system admin and login to obtain authorization.
 * 2. Create a reminder as a system admin for deletion scenarios.
 * 3. Attempt to delete the reminder without authentication (fresh connection):
 *    expect access denied.
 * 4. Attempt to delete reminder as a system admin (should succeed for setup,
 *    but mostly focus on error cases).
 * 5. Attempt to delete the same reminder again (double deletion): expect error
 *    indicating already deleted.
 * 6. (Compliance lock test: if supported by backend, create a special
 *    reminder/status and attempt to delete—if not possible, skip.)
 *
 * Each error scenario uses TestValidator.error() with descriptive titles.
 * Focus is on correct enforcement of permissions, business rules, and input
 * validation.
 */
export async function test_api_systemadmin_reminder_delete_validation_and_error_responses(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = "P@ssw0rd!12345";
  const join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin_email,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: admin_email,
      password: admin_password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(join);

  // 2. Login as system admin
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin_email,
      provider: "local",
      provider_key: admin_email,
      password: admin_password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Create reminder for test
  const reminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      {
        body: {
          reminder_type: RandomGenerator.pick([
            "appointment",
            "compliance",
            "note",
          ]) as string,
          reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_for: new Date(Date.now() + 3600_000).toISOString(),
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(reminder);

  // 4. Attempt to delete reminder without authentication (fresh connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated reminder delete (should fail)",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.reminders.erase(
        unauthConn,
        {
          reminderId: reminder.id,
        },
      );
    },
  );

  // 5. Delete as system admin (should succeed)
  await api.functional.healthcarePlatform.systemAdmin.reminders.erase(
    connection,
    {
      reminderId: reminder.id,
    },
  );

  // 6. Try to delete the same reminder again (double delete)
  await TestValidator.error(
    "double-delete should error (already deleted)",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.reminders.erase(
        connection,
        {
          reminderId: reminder.id,
        },
      );
    },
  );

  // 7. (Optional) Simulated "compliance lock": not implemented unless supported by backend. If in the future, check for business error on compliance-locked reminders.
}
