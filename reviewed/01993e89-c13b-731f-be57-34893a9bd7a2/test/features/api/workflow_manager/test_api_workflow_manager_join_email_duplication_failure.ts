import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

export async function test_api_workflow_manager_join_email_duplication_failure(
  connection: api.IConnection,
) {
  // Step 1: Create a new workflowManager user with a unique email
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate a hashed password string

  const bodyCreate1 = {
    email: email,
    password_hash: passwordHash,
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const result1: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: bodyCreate1,
    });
  typia.assert(result1);

  // Step 2: Attempt to create another workflowManager user with the same email to test duplication failure
  const bodyCreate2 = {
    email: email,
    password_hash: RandomGenerator.alphaNumeric(64), // new hash value but same email
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  // Step 3: Validate the API rejects with error
  await TestValidator.error(
    "Join should fail due to email duplication",
    async () => {
      await api.functional.auth.workflowManager.join(connection, {
        body: bodyCreate2,
      });
    },
  );
}
