import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Test retrieving detailed information of a system administrator user by unique
 * ID.
 *
 * Scenario covers:
 *
 * - Successful retrieval by ID with valid systemAdmin authentication
 * - Unauthorized access errors with no or invalid authentication
 * - Resource not found error when systemAdmin user ID does not exist
 *
 * Dependencies:
 *
 * - Creating a systemAdmin user by join (to establish authorization context)
 * - Logging in the systemAdmin user to obtain valid auth tokens
 * - Creating the systemAdmin user to be retrieved
 */
export async function test_api_systemadmin_get_system_admin_user_detail_success_and_authorization_errors(
  connection: api.IConnection,
) {
  // 0. Prepare systemAdmin user credentials
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "password123";

  // 1. Create systemAdmin user using join dependency
  const joined: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(joined);

  // Extract systemAdmin user ID
  const userId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(joined.id);

  // 2. Log in systemAdmin user to acquire authorization token
  const loggedIn: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
    });
  typia.assert(loggedIn);

  // 3. SUCCESS: Retrieve the systemAdmin user detail with valid authentication
  const systemAdmin: INotificationWorkflowSystemAdmin =
    await api.functional.notificationWorkflow.systemAdmin.systemAdmins.at(
      connection,
      {
        id: userId,
      },
    );
  typia.assert(systemAdmin);
  TestValidator.equals(
    "retrieved systemAdmin user id equals created id",
    systemAdmin.id,
    userId,
  );

  // 4. ERROR: Unauthorized access - unauthenticated connection
  // Prepare unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access without any authentication should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.systemAdmins.at(
        unauthenticatedConnection,
        {
          id: userId,
        },
      );
    },
  );

  // 5. ERROR: Unauthorized access - logged in as different systemAdmin
  // Create a different systemAdmin user to test authorization boundary
  const email2: string = typia.random<string & tags.Format<"email">>();
  const password2 = "password456";
  const differentAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: email2,
        password: password2,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(differentAdmin);

  // Log in different systemAdmin user
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: email2,
      password: password2,
    } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
  });

  await TestValidator.error(
    "different systemAdmin user should not access other user detail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.systemAdmins.at(
        connection,
        {
          id: userId,
        },
      );
    },
  );

  // 6. ERROR: Resource Not Found - non-existing systemAdmin user ID
  const nonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "retrieving non-existing systemAdmin user should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.systemAdmins.at(
        connection,
        {
          id: nonExistingId,
        },
      );
    },
  );
}
