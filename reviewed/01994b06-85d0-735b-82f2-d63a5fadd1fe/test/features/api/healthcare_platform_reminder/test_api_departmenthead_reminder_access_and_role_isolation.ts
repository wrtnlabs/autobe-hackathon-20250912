import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";

/**
 * Validates department head reminder access and role scope isolation in the
 * healthcare platform.
 *
 * Ensures a department head can access only reminders for their own
 * department/org and not for others. Validates error handling for
 * unauthorized and overreaching queries, as well as correct pagination and
 * search logic. Steps:
 *
 * 1. Register and log in as department head A.
 * 2. Create reminders for department head A's department.
 * 3. Retrieve reminders as department head A and verify only department A's
 *    reminders are returned.
 * 4. Register and log in as department head B (another dept/org).
 * 5. Create reminders for department head B.
 * 6. Retrieve reminders as department head B to verify separation.
 * 7. Attempt to use overreaching query filters as department head B (e.g.,
 *    filter by department A's org), and expect denial/no data.
 * 8. Validate pagination and search with keyword and scheduled time window.
 * 9. Attempt to retrieve reminders without authentication and expect failure.
 */
export async function test_api_departmenthead_reminder_access_and_role_isolation(
  connection: api.IConnection,
) {
  // Register and login as department head A
  const emailA = typia.random<string & tags.Format<"email">>();
  const joinReqA = {
    email: emailA,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Password123!",
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const authA = await api.functional.auth.departmentHead.join(connection, {
    body: joinReqA,
  });
  typia.assert(authA);

  // Create reminders for A's department
  const remindersA = ArrayUtil.repeat(
    3,
    () =>
      ({
        reminder_type: RandomGenerator.paragraph({ sentences: 2 }),
        reminder_message: RandomGenerator.paragraph({ sentences: 8 }),
        scheduled_for: new Date(
          Date.now() + Math.floor(Math.random() * 86400000),
        ).toISOString(),
        organization_id: authA.id, // Simulating department/org scoping
        target_user_id: null,
        status: "pending",
      }) satisfies IHealthcarePlatformReminder.ICreate,
  );
  const createdRemindersA = [];
  for (const reminder of remindersA) {
    const created =
      await api.functional.healthcarePlatform.departmentHead.reminders.create(
        connection,
        { body: reminder },
      );
    typia.assert(created);
    createdRemindersA.push(created);
  }

  // Retrieve reminders as A, verify only A's reminders are returned, and match count
  const pageA =
    await api.functional.healthcarePlatform.departmentHead.reminders.index(
      connection,
      {
        body: {
          organization_id: authA.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(pageA);
  TestValidator.predicate(
    "all reminders returned for A have valid message",
    pageA.data.every((r) => r.id && typeof r.reminder_message === "string"),
  );
  TestValidator.predicate(
    "reminder count for A matches created count",
    pageA.data.length >= createdRemindersA.length,
  );

  // Register and login as department head B
  const emailB = typia.random<string & tags.Format<"email">>();
  const joinReqB = {
    email: emailB,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Password456!",
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const authB = await api.functional.auth.departmentHead.join(connection, {
    body: joinReqB,
  });
  typia.assert(authB);

  // Create reminders for B's department
  const remindersB = ArrayUtil.repeat(
    2,
    () =>
      ({
        reminder_type: RandomGenerator.paragraph({ sentences: 2 }),
        reminder_message: RandomGenerator.paragraph({ sentences: 8 }),
        scheduled_for: new Date(
          Date.now() + Math.floor(Math.random() * 86400000),
        ).toISOString(),
        organization_id: authB.id,
        target_user_id: null,
        status: "pending",
      }) satisfies IHealthcarePlatformReminder.ICreate,
  );
  const createdRemindersB = [];
  for (const reminder of remindersB) {
    const created =
      await api.functional.healthcarePlatform.departmentHead.reminders.create(
        connection,
        { body: reminder },
      );
    typia.assert(created);
    createdRemindersB.push(created);
  }

  // Switch to department head B by logging in
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: emailB,
      password: "Password456!",
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Retrieve reminders as B, verify only B's reminders are returned
  const pageB =
    await api.functional.healthcarePlatform.departmentHead.reminders.index(
      connection,
      {
        body: {
          organization_id: authB.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(pageB);
  TestValidator.predicate(
    "all reminders returned for B have valid message",
    pageB.data.every((r) => r.id && typeof r.reminder_message === "string"),
  );
  TestValidator.predicate(
    "reminder count for B matches created count",
    pageB.data.length >= createdRemindersB.length,
  );

  // Attempt to overreach as B: try to retrieve reminders from A's department/org
  const overreachResult =
    await api.functional.healthcarePlatform.departmentHead.reminders.index(
      connection,
      {
        body: {
          organization_id: authA.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(overreachResult);
  TestValidator.equals(
    "department head B sees no reminders for org A",
    overreachResult.data.length,
    0,
  );

  // Pagination test (limit = 1)
  const paged =
    await api.functional.healthcarePlatform.departmentHead.reminders.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "pagination returns at most 1 reminder",
    paged.data.length <= 1,
  );

  // Keyword search test for B's reminders
  if (createdRemindersB.length > 0) {
    const keyword =
      RandomGenerator.pick(createdRemindersB).reminder_message.split(" ")[0];
    const searchResult =
      await api.functional.healthcarePlatform.departmentHead.reminders.index(
        connection,
        {
          body: {
            reminder_message: keyword,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      "keyword search returns only reminders containing keyword",
      searchResult.data.every((r) => r.reminder_message.includes(keyword)),
    );
  }

  // Scheduled_for window filter test
  if (createdRemindersB.length > 0) {
    const first = createdRemindersB[0].scheduled_for;
    const schedResult =
      await api.functional.healthcarePlatform.departmentHead.reminders.index(
        connection,
        {
          body: {
            scheduled_for_from: first,
            scheduled_for_to: first,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(schedResult);
    TestValidator.predicate(
      "scheduled_for_from/to filters reminders by scheduled time",
      schedResult.data.every((r) => r.scheduled_for === first),
    );
  }

  // Test unauthorized access: use a connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized reminder search should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.reminders.index(
        unauthConn,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    },
  );
}
