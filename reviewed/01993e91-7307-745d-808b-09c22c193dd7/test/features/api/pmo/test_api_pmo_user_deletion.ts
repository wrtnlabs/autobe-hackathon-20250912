import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Test the deletion of PMO users ensuring proper authorization and
 * idempotency.
 *
 * This test covers:
 *
 * 1. Creating an authorized PMO admin user who has deletion privileges.
 * 2. Authenticating as the admin user.
 * 3. Creating a second PMO user intended to be deleted.
 * 4. Deleting the second user successfully.
 * 5. Repeating delete to check idempotency.
 * 6. Attempting deletion of a non-existent user and expecting failure.
 * 7. Creating an unauthorized PMO user.
 * 8. Attempting to delete a user with the unauthorized user's token and
 *    expecting rejection.
 *
 * This verifies role-based access control, correct API behavior, and error
 * handling.
 */
export async function test_api_pmo_user_deletion(connection: api.IConnection) {
  // 1. Create a PMO user with deletion privileges
  const pmoAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P4ssword!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const adminUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoAdminJoin,
    });
  typia.assert(adminUser);

  // 2. Authenticate as PMO user with deletion rights (login - token set internally)
  const adminLoginBody = {
    email: pmoAdminJoin.email,
    password: pmoAdminJoin.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loggedInAdmin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create another PMO user who will be the deletion target
  const pmoUserJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  // Use a separate connection with empty headers to simulate a new user join
  const userConnection: api.IConnection = { ...connection, headers: {} };
  const targetUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(userConnection, {
      body: pmoUserJoin,
    });
  typia.assert(targetUser);

  // 4. Delete the target user with admin token
  await api.functional.taskManagement.pmo.taskManagement.pmos.erase(
    connection,
    {
      id: targetUser.id,
    },
  );

  // 5. Repeat delete to check idempotency
  await api.functional.taskManagement.pmo.taskManagement.pmos.erase(
    connection,
    {
      id: targetUser.id,
    },
  );

  // 6. Attempt to delete non-existent user should fail
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent user should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.erase(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );

  // 7. Create unauthorized PMO user
  const pmoUserForbiddenJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherPass!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const forbiddenUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(userConnection, {
      body: pmoUserForbiddenJoin,
    });
  typia.assert(forbiddenUser);

  // 8. Login as unauthorized user
  const forbiddenLoginBody = {
    email: pmoUserForbiddenJoin.email,
    password: pmoUserForbiddenJoin.password,
  } satisfies ITaskManagementPmo.ILogin;

  await api.functional.auth.pmo.login(connection, {
    body: forbiddenLoginBody,
  });

  // 9. Unauthorized user attempt to delete admin user - expect error
  await TestValidator.error(
    "unauthorized user delete attempt should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.erase(
        connection,
        {
          id: adminUser.id,
        },
      );
    },
  );
}
