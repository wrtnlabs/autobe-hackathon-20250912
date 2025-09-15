import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";

/**
 * This E2E test validates process of PMO user's priority deletion respecting
 * strict authentication and resource access rules.
 *
 * Authorization as PMO role is assumed for priority creation and deletion.
 *
 * Sequential process:
 *
 * 1. PMO user registered and logged-in
 * 2. New task priority created with randomized and realistic fields
 * 3. Created priority deleted by UUID
 * 4. Confirm deletion by expecting error on repeated deletion and invalid UUID
 */
export async function test_api_task_management_priority_deletion_pmo(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(pmoUser);

  // 2. PMO user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loginResult: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loginResult);
  TestValidator.equals(
    "PMO user id unchanged after login",
    loginResult.id,
    pmoUser.id,
  );

  // 3. Create task priority
  const createBody = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ITaskManagementPriority.ICreate;

  const createdPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdPriority);

  TestValidator.equals(
    "Created priority code matches input",
    createdPriority.code,
    createBody.code,
  );

  // 4. Delete the created priority
  await api.functional.taskManagement.pmo.taskManagementPriorities.erase(
    connection,
    { id: createdPriority.id },
  );

  // 5. Confirm deletion by checking deletion again results in error
  await TestValidator.error(
    "Deleting deleted priority should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementPriorities.erase(
        connection,
        { id: createdPriority.id },
      );
    },
  );

  // 6. Confirm deletion by checking deletion of a random unknown UUID fails
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent priority should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementPriorities.erase(
        connection,
        { id: randomId },
      );
    },
  );
}
