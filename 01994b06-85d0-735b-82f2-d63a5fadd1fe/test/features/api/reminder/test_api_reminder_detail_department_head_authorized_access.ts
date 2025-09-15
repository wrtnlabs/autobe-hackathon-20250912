import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate that department head can access reminder details in their department
 * and not outside it.
 *
 * 1. Register (join) a department head and log in
 * 2. Create a reminder via department head endpoint (which will be owned by this
 *    department head)
 * 3. Retrieve reminder details for this reminder by its id and assert all fields
 *    match schema
 * 4. Register and log in a second department head
 * 5. Attempt to fetch the original reminder as the second department head and
 *    expect a business error (forbidden)
 */
export async function test_api_reminder_detail_department_head_authorized_access(
  connection: api.IConnection,
) {
  // 1. Register (join) a department head
  const deptHeadEmail: string = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const joinRequest = {
    email: deptHeadEmail,
    full_name: RandomGenerator.name(),
    password: deptHeadPassword,
    phone: RandomGenerator.mobile(),
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const departmentHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: joinRequest,
    });
  typia.assert(departmentHead);

  // 2. Log in as department head (refresh auth, optional for logic completeness)
  const loginRequest = {
    email: deptHeadEmail,
    password: deptHeadPassword,
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loggedIn: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: loginRequest,
    });
  typia.assert(loggedIn);
  TestValidator.equals(
    "department head email matches",
    departmentHead.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "department head id matches",
    departmentHead.id,
    loggedIn.id,
  );

  // 3. Create a reminder
  const reminderCreate = {
    reminder_type: RandomGenerator.paragraph({ sentences: 2 }),
    reminder_message: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    status: "pending",
    organization_id: null, // no explicit org
    target_user_id: null,
    delivered_at: null,
    acknowledged_at: null,
    snoozed_until: null,
    failure_reason: null,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const created: IHealthcarePlatformReminder =
    await api.functional.healthcarePlatform.departmentHead.reminders.create(
      connection,
      { body: reminderCreate },
    );
  typia.assert(created);
  TestValidator.equals(
    "reminder type matches",
    created.reminder_type,
    reminderCreate.reminder_type,
  );
  TestValidator.equals(
    "reminder message matches",
    created.reminder_message,
    reminderCreate.reminder_message,
  );
  TestValidator.equals(
    "reminder status matches",
    created.status,
    reminderCreate.status,
  );

  // 4. Retrieve the reminder in detail from this department head
  const fetched: IHealthcarePlatformReminder =
    await api.functional.healthcarePlatform.departmentHead.reminders.at(
      connection,
      { reminderId: created.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched reminder matches created",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched reminder type",
    fetched.reminder_type,
    created.reminder_type,
  );
  TestValidator.equals(
    "fetched reminder message",
    fetched.reminder_message,
    created.reminder_message,
  );

  // 5. Register a second department head for cross-department access attempt
  const deptHead2Email: string = typia.random<string & tags.Format<"email">>();
  const deptHead2Password = RandomGenerator.alphaNumeric(12);
  const joinRequest2 = {
    email: deptHead2Email,
    full_name: RandomGenerator.name(),
    password: deptHead2Password,
    phone: RandomGenerator.mobile(),
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  await api.functional.auth.departmentHead.join(connection, {
    body: joinRequest2,
  });

  // Switch to the second department head (login)
  const loginRequest2 = {
    email: deptHead2Email,
    password: deptHead2Password,
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  await api.functional.auth.departmentHead.login(connection, {
    body: loginRequest2,
  });

  // 6. Attempt to retrieve the first reminder as a different department head, expect error
  await TestValidator.error(
    "department head from another org cannot access reminder outside department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.reminders.at(
        connection,
        { reminderId: created.id },
      );
    },
  );
}
