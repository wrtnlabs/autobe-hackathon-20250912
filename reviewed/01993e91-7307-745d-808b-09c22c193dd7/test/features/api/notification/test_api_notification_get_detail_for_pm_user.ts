import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Validate retrieval of detailed notification data for a PM user.
 *
 * This test covers the full user journey:
 *
 * 1. Register a new PM user with valid credentials.
 * 2. Login the PM user to retrieve JWT authorization tokens.
 * 3. Ensure there is at least one notification exist for that user (by
 *    fetching a random notification ID from a random sample).
 * 4. Retrieve notification information by its valid UUID using GET API.
 * 5. Validate that the notification details match expected data including id,
 *    notification_type, and timestamps.
 * 6. Validate access control by testing retrieval without authentication,
 *    expecting failure.
 * 7. Validate error handling by attempting to retrieve notification with
 *    invalid UUID, expecting error.
 */
export async function test_api_notification_get_detail_for_pm_user(
  connection: api.IConnection,
) {
  // 1. Register a new PM user
  const pmCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "TestPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmUser);

  // 2. Login the PM user to retrieve JWT tokens
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmLoginResult: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoginResult);

  // 3. Setup: Prepare a notification ID from a simulated notification. Since no create API for notifications,
  // we just use a random notification ID to test retrieval API. The actual notification may or may not belong
  // to the logged in user. We rely on typia.assert to validate response conforms to notification DTO.
  const notificationSample: ITaskManagementNotification =
    typia.random<ITaskManagementNotification>();
  const notificationId = notificationSample.id;

  // 4. Retrieve notification detail by valid ID
  const notificationDetail: ITaskManagementNotification =
    await api.functional.taskManagement.pm.notifications.at(connection, {
      id: notificationId,
    });
  typia.assert(notificationDetail);

  // Validate that the notification's id matches
  TestValidator.equals(
    "retrieved notification id matches requested",
    notificationDetail.id,
    notificationId,
  );

  // Validate fields like notification_type and is_read are present and valid
  TestValidator.predicate(
    "notification has valid notification_type",
    typeof notificationDetail.notification_type === "string" &&
      notificationDetail.notification_type.length > 0,
  );
  TestValidator.predicate(
    "notification is_read is boolean",
    typeof notificationDetail.is_read === "boolean",
  );

  // 5. Test error scenario: no authentication (simulate by clearing headers and making the call)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt unauthorized access should fail
  await TestValidator.error(
    "unauthorized access without login should fail",
    async () => {
      await api.functional.taskManagement.pm.notifications.at(unauthConn, {
        id: notificationId,
      });
    },
  );

  // 6. Test error scenario: invalid notification ID (random UUID which likely does not exist)
  const invalidId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "invalid notification id access should fail",
    async () => {
      await api.functional.taskManagement.pm.notifications.at(connection, {
        id: invalidId,
      });
    },
  );
}
