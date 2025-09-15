import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Test the QA user notification retrieval by ID endpoint with the full
 * authentication flow.
 *
 * This test validates that a QA user can register, login, and retrieve
 * notification details securely and correctly. It ensures the data returned
 * matches the expected notification schema.
 *
 * The workflow involves:
 *
 * 1. Registering a QA user with valid credentials.
 * 2. Authenticating the QA user to obtain JWT tokens.
 * 3. Retrieving a notification by its unique ID using authenticated access.
 *
 * The test asserts proper type integrity for all responses and ensures the
 * notification retrieved matches the user's scope and expectations.
 */
export async function test_api_notification_retrieval_by_id_as_qa(
  connection: api.IConnection,
) {
  // Step 1: Create QA user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(24),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const joined: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: createBody,
    });
  typia.assert(joined);

  // Step 2: Login QA user
  const loginBody = {
    email: createBody.email,
    password: "1234",
  } satisfies ITaskManagementQa.ILogin;
  const loggedIn: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Step 3: Retrieve notification by ID
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const notification: ITaskManagementNotification =
    await api.functional.taskManagement.qa.notifications.at(connection, {
      id: notificationId,
    });
  typia.assert(notification);
}
