import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate receptionist reminder update – error handling and validation.
 *
 * 1. Register receptionist A and create a reminder as OrgA
 * 2. Attempt update with invalid values (scheduled_for in the past)
 * 3. Attempt update with immutable fields (impossible; skipped)
 * 4. Attempt to update a non-existent reminderId
 * 5. Register receptionist B under a different org and attempt to update OrgA's
 *    reminder (permission error)
 * 6. Soft-delete the reminder (simulated by status 'cancelled'), then attempt
 *    update again (should fail)
 */
export async function test_api_receptionist_reminder_update_validation_and_error_handling(
  connection: api.IConnection,
) {
  // Step 1: Register receptionist A and login
  const recA_email = typia.random<string & tags.Format<"email">>();
  const recA_password = RandomGenerator.alphaNumeric(10);
  const receptionistA = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: recA_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(receptionistA);

  // Step 2: Create a reminder as receptionist A
  const reminderCreate = {
    reminder_type: RandomGenerator.paragraph({ sentences: 2 }),
    reminder_message: RandomGenerator.paragraph({ sentences: 4 }),
    scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    organization_id: undefined,
    target_user_id: undefined,
    status: "pending",
    delivered_at: undefined,
    acknowledged_at: undefined,
    snoozed_until: undefined,
    failure_reason: undefined,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.receptionist.reminders.create(
      connection,
      {
        body: reminderCreate,
      },
    );
  typia.assert(reminder);

  // Step 3: Attempt update with scheduled_for in the past
  await TestValidator.error(
    "scheduled_for in the past should fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.update(
        connection,
        {
          reminderId: reminder.id,
          body: {
            scheduled_for: new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        },
      );
    },
  );

  // Step 4: Attempt to update a non-existent reminderId
  await TestValidator.error(
    "updating a non-existent reminderId should fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.update(
        connection,
        {
          reminderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reminder_message: RandomGenerator.paragraph(),
          },
        },
      );
    },
  );

  // Step 5: Register receptionist B under a different org, login as B, and attempt to update A's reminder
  const recB_email = typia.random<string & tags.Format<"email">>();
  const recB_password = RandomGenerator.alphaNumeric(10);
  const receptionistB = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: recB_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(receptionistB);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: recB_email,
      password: recB_password,
    },
  });
  await TestValidator.error(
    "other org receptionist cannot update the reminder",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.update(
        connection,
        {
          reminderId: reminder.id,
          body: {
            status: "sent",
          },
        },
      );
    },
  );

  // Step 6: Soft-delete the reminder (simulate via status update), then attempt update (should fail)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: recA_email,
      password: recA_password,
    },
  });
  await api.functional.healthcarePlatform.receptionist.reminders.update(
    connection,
    {
      reminderId: reminder.id,
      body: {
        status: "cancelled",
      },
    },
  );
  await TestValidator.error(
    "cannot update reminder after soft-delete (cancelled)",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.update(
        connection,
        {
          reminderId: reminder.id,
          body: {
            status: "pending",
          },
        },
      );
    },
  );
}
