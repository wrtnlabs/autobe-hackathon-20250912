import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";

/**
 * Test updating a WorkerService user's details for an authenticated
 * workerService role user.
 *
 * This test covers creating a new workerService user via authentication join
 * endpoint, performing a successful update with valid authentication, and
 * validating full update response fields.
 *
 * It also tests failure scenarios including unauthorized update attempts and
 * updates on non-existent user IDs, verifying error handling.
 *
 * The test uses realistic random data to ensure true validation of API behavior
 * using the official API client functions.
 */
export async function test_api_worker_service_worker_services_update(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new workerService user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash = `hashed_${RandomGenerator.alphaNumeric(20)}`;
  const authUser: INotificationWorkflowWorkerService.IAuthorized =
    await api.functional.auth.workerService.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkerService.ICreate,
    });
  typia.assert(authUser);

  // 2. Update the worker service user successfully
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPasswordHash = `hashed_${RandomGenerator.alphaNumeric(20)}`;
  const updated: INotificationWorkflowWorkerService =
    await api.functional.notificationWorkflow.workerService.workerServices.update(
      connection,
      {
        id: authUser.id,
        body: {
          email: newEmail,
          password_hash: newPasswordHash,
        } satisfies INotificationWorkflowWorkerService.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated id matches original", updated.id, authUser.id);
  TestValidator.equals(
    "updated email matches new email",
    updated.email,
    newEmail,
  );

  // 3. Attempt update with unauthenticated connection (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update should fail", async () => {
    await api.functional.notificationWorkflow.workerService.workerServices.update(
      unauthConn,
      {
        id: authUser.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: `hashed_${RandomGenerator.alphaNumeric(20)}`,
        } satisfies INotificationWorkflowWorkerService.IUpdate,
      },
    );
  });

  // 4. Attempt update for non-existent user id
  await TestValidator.error(
    "update for non-existent user should fail",
    async () => {
      await api.functional.notificationWorkflow.workerService.workerServices.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies INotificationWorkflowWorkerService.IUpdate,
        },
      );
    },
  );
}
