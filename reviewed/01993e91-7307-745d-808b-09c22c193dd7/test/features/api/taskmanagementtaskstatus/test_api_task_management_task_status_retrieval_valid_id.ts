import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

export async function test_api_task_management_task_status_retrieval_valid_id(
  connection: api.IConnection,
) {
  // Step 1: QA user signup using join endpoint
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const authorizedUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: userCreate,
    });
  typia.assert(authorizedUser);

  // Step 2: Login with same user credentials
  const userLogin = {
    email: userCreate.email,
    password: userCreate.password_hash,
  } satisfies ITaskManagementQa.ILogin;

  const loggedInUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: userLogin,
    });
  typia.assert(loggedInUser);

  // Step 3: Fetch an existing task status
  // Since no create API is provided, we simulate retrieval by using a random valid ID
  // Optionally, real environment might use a pre-seeded UUID for tests
  const existingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.qa.taskManagementTaskStatuses.at(
      connection,
      {
        id: existingId,
      },
    );
  typia.assert(taskStatus);

  // Step 4: Test fetching with a non-existent ID → should throw error
  await TestValidator.error(
    "fetch with non-existent ID should fail",
    async () => {
      await api.functional.taskManagement.qa.taskManagementTaskStatuses.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 5: Test fetching with an invalid ID format → should throw error
  await TestValidator.error(
    "fetch with invalid ID format should fail",
    async () => {
      await api.functional.taskManagement.qa.taskManagementTaskStatuses.at(
        connection,
        {
          id: "invalid-uuid-format-string",
        },
      );
    },
  );
}
