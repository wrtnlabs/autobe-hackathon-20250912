import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validates detailed retrieval of a single notification for a TPM user.
 *
 * Entire workflow:
 *
 * 1. TPM user registration (/auth/tpm/join)
 * 2. TPM user login (/auth/tpm/login)
 * 3. Retrieve notification by ID (/taskManagement/tpm/notifications/{id})
 * 4. Verify retrieved notification fields for correctness and type compliance
 * 5. Attempt to fetch non-existent notification and expect error
 *
 * Note: Notifications creation or listing endpoint is not provided, so a
 * random UUID is used as an example for retrieval.
 */
export async function test_api_notification_get_detail_for_tpm_user(
  connection: api.IConnection,
) {
  // 1. TPM user registers
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const joined: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(joined);

  // 2. TPM user logs in
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Try to retrieve an existing notification (simulate with a random UUID)
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const notification: ITaskManagementNotification =
    await api.functional.taskManagement.tpm.notifications.at(connection, {
      id: notificationId,
    });
  typia.assert(notification);

  TestValidator.equals(
    "notification id match",
    notification.id,
    notificationId,
  );
  TestValidator.predicate(
    "notification has user_id UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      notification.user_id,
    ),
  );
  TestValidator.predicate(
    "notification type is string and non-empty",
    typeof notification.notification_type === "string" &&
      notification.notification_type.length > 0,
  );
  TestValidator.predicate(
    "notification is_read is boolean",
    typeof notification.is_read === "boolean",
  );

  // 4. Test error case with non-existent notification ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error on non-existent notification id",
    async () => {
      await api.functional.taskManagement.tpm.notifications.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
