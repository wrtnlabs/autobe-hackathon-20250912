import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Test notification index API for PMO users, ensuring correct filtering,
 * pagination, and authorization.
 */
export async function test_api_notification_index_pmo_with_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Register a PMO user with random email, password, and name
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const authorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Login the same PMO user to obtain tokens
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const authorizedLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(authorizedLogin);
  TestValidator.equals(
    "login user matches registered user",
    authorizedLogin.id,
    authorized.id,
  );

  // 3. Prepare a request with pagination parameters
  const requestBody1 = {
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;

  const result1 = await api.functional.taskManagement.pmo.notifications.index(
    connection,
    { body: requestBody1 },
  );
  typia.assert(result1);
  TestValidator.predicate(
    "all notifications belong to authorized user",
    result1.data.every((x) => x.user_id === authorized.id),
  );
  TestValidator.equals(
    "pagination current page matches",
    result1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    result1.data.length <= 10,
  );

  // 4. Filter notifications by notification_type if any exist
  const notificationTypes = Array.from(
    new Set(result1.data.map((x) => x.notification_type)),
  ) as readonly string[];

  if (notificationTypes.length > 0) {
    const chosenType = RandomGenerator.pick(notificationTypes);

    const requestBody2 = {
      page: 1,
      limit: 5,
      notification_type: chosenType,
    } satisfies ITaskManagementNotification.IRequest;

    const result2 = await api.functional.taskManagement.pmo.notifications.index(
      connection,
      { body: requestBody2 },
    );
    typia.assert(result2);
    TestValidator.predicate(
      "filtered notifications match notification_type",
      result2.data.every((x) => x.notification_type === chosenType),
    );
    TestValidator.predicate(
      "filtered data length does not exceed limit",
      result2.data.length <= 5,
    );
    TestValidator.equals(
      "pagination current page matches",
      result2.pagination.current,
      1,
    );
  }

  // 5. Filter notifications by read status
  const requestBody3 = {
    page: 1,
    limit: 10,
    is_read: true,
  } satisfies ITaskManagementNotification.IRequest;

  const result3 = await api.functional.taskManagement.pmo.notifications.index(
    connection,
    { body: requestBody3 },
  );
  typia.assert(result3);
  TestValidator.predicate(
    "filtered notifications are all read",
    result3.data.every((x) => x.is_read === true),
  );

  // 6. Test empty result using unlikely search string
  const requestBodyEmpty = {
    page: 1,
    limit: 10,
    search: "thisstringshouldnotmatchanynotification",
  } satisfies ITaskManagementNotification.IRequest;

  const resultEmpty =
    await api.functional.taskManagement.pmo.notifications.index(connection, {
      body: requestBodyEmpty,
    });
  typia.assert(resultEmpty);
  TestValidator.equals(
    "empty result data array length",
    resultEmpty.data.length,
    0,
  );

  // 7. Test unauthorized access returns error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized notification listing fails",
    async () => {
      await api.functional.taskManagement.pmo.notifications.index(
        unauthConnection,
        { body: requestBody1 },
      );
    },
  );
}
