import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * E2E test for successfully deleting reminders as organizationAdmin and
 * validation of denial and error scenarios.
 *
 * This test creates a complete lifecycle for deleting reminders as an org
 * admin:
 *
 * 1. Register and authenticate an org admin.
 * 2. Create a reminder for that admin.
 * 3. Soft-delete the created reminder using DELETE endpoint.
 * 4. Assert that happy path deletion succeeds.
 * 5. Assert that double deletion is denied.
 * 6. Assert that erroneous deletion (invalid reminderId) fails appropriately.
 * 7. Attempt deletion as an unauthenticated user and expect denial.
 * 8. Tests for cross-org/compliance/locked/audit log scenarios are omitted (not
 *    exposed in API contract).
 * 9. Repeats process for a second reminder for coverage and robustness.
 */
export async function test_api_orgadmin_reminder_delete_e2e_success_and_safety(
  connection: api.IConnection,
) {
  // 1. Register an organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        phone: adminPhone,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as organization admin
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create a scheduled reminder as org admin
  const reminderCreateBody = {
    reminder_type: "test-removal",
    reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // one hour later
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      {
        body: reminderCreateBody,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder_type matches",
    reminder.reminder_type,
    reminderCreateBody.reminder_type,
  );
  TestValidator.equals(
    "reminder_message matches",
    reminder.reminder_message,
    reminderCreateBody.reminder_message,
  );
  TestValidator.equals(
    "scheduled_for matches",
    reminder.scheduled_for,
    reminderCreateBody.scheduled_for,
  );

  // 4. DELETE reminder - happy path (soft delete)
  await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
    connection,
    {
      reminderId: reminder.id,
    },
  );

  // 5. Double deletion denied (should result in error)
  await TestValidator.error("Double deletion is denied", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
      connection,
      {
        reminderId: reminder.id,
      },
    );
  });

  // 6. Delete with invalid reminderId (wrong uuid)
  await TestValidator.error(
    "Deleting non-existent reminder fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
        connection,
        {
          reminderId: typia.random<string & tags.Format<"uuid">>(), // random uuid, highly likely not found
        },
      );
    },
  );

  // 7. Delete without authentication is denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthenticated delete is denied", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
      unauthConn,
      {
        reminderId: reminder.id,
      },
    );
  });

  // 8. Compliance-protected/locked/audit/cross-org scenarios not exposed in SDK
  // 9. Optionally, try re-create and delete another reminder for reusability
  const reminder2 =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      {
        body: {
          reminder_type: "test-removal-2",
          reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
          scheduled_for: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  typia.assert(reminder2);
  await api.functional.healthcarePlatform.organizationAdmin.reminders.erase(
    connection,
    { reminderId: reminder2.id },
  );
}
