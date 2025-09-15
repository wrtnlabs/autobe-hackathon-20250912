import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

export async function test_api_pmo_user_update(connection: api.IConnection) {
  // Step 1: Create and authenticate first PMO user via join
  const joinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ss123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser1: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody1 });
  typia.assert(pmoUser1);

  // Step 2: Login as first PMO user
  const loginBody1 = {
    email: joinBody1.email,
    password: joinBody1.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loginUser1: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody1 });
  typia.assert(loginUser1);

  // Step 3: Update first PMO user - change email and name
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IUpdate;
  const updatedUser: ITaskManagementPmo =
    await api.functional.taskManagement.pmo.taskManagement.pmos.update(
      connection,
      {
        id: pmoUser1.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  // Validate updates took place
  TestValidator.equals(
    "email should be updated",
    updatedUser.email,
    updateBody.email,
  );
  TestValidator.notEquals(
    "name should be actually changed",
    updatedUser.name,
    pmoUser1.name,
  );
  TestValidator.equals("id should remain same", updatedUser.id, pmoUser1.id);

  // Step 4: Attempt update with non-existent user ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update should fail with non-existent user ID",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.update(
        connection,
        {
          id: fakeId,
          body: updateBody,
        },
      );
    },
  );

  // Step 5: Create and authenticate second PMO user
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherP@ss456",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser2: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody2 });
  typia.assert(pmoUser2);

  // Login as second PMO user
  const loginBody2 = {
    email: joinBody2.email,
    password: joinBody2.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loginUser2: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody2 });
  typia.assert(loginUser2);

  // Step 6: Attempt unauthorized update of first user under second user's credentials
  await TestValidator.error(
    "unauthorized PMO user cannot update another user",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.update(
        connection,
        {
          id: pmoUser1.id,
          body: {
            name: RandomGenerator.name(),
          } satisfies ITaskManagementPmo.IUpdate,
        },
      );
    },
  );
}
