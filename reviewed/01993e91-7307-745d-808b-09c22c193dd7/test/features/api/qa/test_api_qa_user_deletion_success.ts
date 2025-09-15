import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_qa_user_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a QA user who will perform the deletion (actor user).
  const actorUserEmail: string = typia.random<string & tags.Format<"email">>();
  const actorUserPassword: string = RandomGenerator.alphaNumeric(12);
  const actorUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: actorUserEmail,
        password_hash: actorUserPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(actorUser);

  // Step 2: Register a QA user to be deleted (target user).
  const targetUserEmail: string = typia.random<string & tags.Format<"email">>();
  const targetUserPassword: string = RandomGenerator.alphaNumeric(12);
  const targetUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: targetUserEmail,
        password_hash: targetUserPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(targetUser);

  // Step 3: Act via actor user context (Already authenticated by join API call).
  // Since SDK handles auth tokens internally, no manual token management is needed.

  // Step 4: Delete the target QA user by ID.
  await api.functional.taskManagement.qa.taskManagement.qas.erase(connection, {
    id: targetUser.id,
  });

  // Step 5: Verify that deletion removes the user by attempting operations using deleted user's credentials.
  // First, attempt to authenticate the deleted user; expect failure.
  await TestValidator.error("deleted user cannot authenticate", async () => {
    await api.functional.auth.qa.join(connection, {
      body: {
        email: targetUserEmail,
        password_hash: targetUserPassword,
        name: RandomGenerator.name(), // new name but email duplicate to show failure
      } satisfies ITaskManagementQa.ICreate,
    });
  });

  // Step 6: Verify actor user still can authenticate.
  // We try logging in again to confirm the actor user is still valid.
  await api.functional.auth.qa.join(connection, {
    body: {
      email: actorUserEmail,
      password_hash: actorUserPassword,
      name: actorUser.name, // same name
    } satisfies ITaskManagementQa.ICreate,
  });

  // Step 7: Test error cases
  // Attempt to delete a non-existent user ID, expect an error.
  await TestValidator.error("deleting non-existent user fails", async () => {
    await api.functional.taskManagement.qa.taskManagement.qas.erase(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(), // Random UUID that does not exist
      },
    );
  });

  // Attempt unauthorized delete: For this scenario, since only 'qa' role users exist,
  // and no other roles or users, we simulate unauthorized by using an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot delete QA user",
    async () => {
      await api.functional.taskManagement.qa.taskManagement.qas.erase(
        unauthConn,
        {
          id: actorUser.id,
        },
      );
    },
  );
}
