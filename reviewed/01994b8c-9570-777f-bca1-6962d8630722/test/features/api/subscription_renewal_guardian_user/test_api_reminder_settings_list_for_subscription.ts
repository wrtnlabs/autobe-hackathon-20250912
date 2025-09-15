import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISubscriptionRenewalGuardianReminderSettings";
import type { ISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianReminderSettings";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";

/**
 * Validate listing reminder settings belonging to a user subscription.
 *
 * The test starts by registering and authenticating a user via POST
 * /auth/user/join, ensuring a valid user account is created.
 *
 * Since no API for subscription creation is provided, a random
 * subscriptionId is generated.
 *
 * The main test calls PATCH
 * /subscriptionRenewalGuardian/user/subscriptions/{subscriptionId}/reminderSettings
 * to retrieve the reminder settings list.
 *
 * Validation steps include:
 *
 * - Pagination property checks for non-negative values.
 * - Each reminder's days_before is restricted to 7, 3, or 1.
 * - Each reminder's channel is exactly "EMAIL" or "NONE".
 *
 * This test ensures the endpoint returns valid reminders for the
 * subscription, abiding by format and business rules.
 */
export async function test_api_reminder_settings_list_for_subscription(
  connection: api.IConnection,
) {
  // 1. User join and authenticate
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Since API for subscription creation is unavailable, use a random UUID for subscriptionId
  const subscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Retrieve list of reminder settings for the subscription
  const reminderList: IPageISubscriptionRenewalGuardianReminderSettings.ISummary =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.index(
      connection,
      {
        subscriptionId: subscriptionId,
      },
    );
  typia.assert(reminderList);

  // 3. Validate the pagination properties
  TestValidator.predicate(
    "pagination.current must be non-negative",
    reminderList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    reminderList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    reminderList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    reminderList.pagination.pages >= 0,
  );

  // 4. Validate each reminder setting in the list
  for (const reminder of reminderList.data) {
    typia.assert(reminder);

    // days_before must be one of 7, 3, or 1
    TestValidator.predicate(
      "days_before must be 7, 3, or 1",
      reminder.days_before === 7 ||
        reminder.days_before === 3 ||
        reminder.days_before === 1,
    );

    // channel must be exactly "EMAIL" or "NONE"
    TestValidator.predicate(
      `reminder channel must be EMAIL or NONE but got ${reminder.channel}`,
      reminder.channel === "EMAIL" || reminder.channel === "NONE",
    );
  }
}
