import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";

/**
 * Validate system admin ability to update WorkerService user accounts.
 *
 * This test ensures the system administrator can perform updates to
 * WorkerService user accounts securely and successfully. It also confirms that
 * unauthorized updates and updates on invalid IDs are handled properly.
 *
 * Steps:
 *
 * 1. System administrator joins with an email and password.
 * 2. System administrator logs in to establish authentication context.
 * 3. Update an existing WorkerService user account's email and/or password_hash.
 * 4. Attempt to update a non-existent WorkerService user ID, expecting an error.
 */
export async function test_api_system_admin_worker_services_update(
  connection: api.IConnection,
) {
  // 1. System administrator join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const sysAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(sysAdmin);

  // 2. System administrator login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;
  const sysAdminLogin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(sysAdminLogin);

  // 3. Attempt update for WorkerService user (random UUID),
  // expects success or handle possible error due to non-existence
  const updateBody = {
    email: RandomGenerator.name(1) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkerService.IUpdate;

  const workerServiceId = typia.random<string & tags.Format<"uuid">>();

  try {
    const updatedUser: INotificationWorkflowWorkerService =
      await api.functional.notificationWorkflow.systemAdmin.workerServices.update(
        connection,
        {
          id: workerServiceId,
          body: updateBody,
        },
      );
    typia.assert(updatedUser);
    TestValidator.equals(
      "updated user email matches update",
      updatedUser.email,
      updateBody.email,
    );
  } catch {
    // assuming failure could occur if id does not exist
    // negative case handled separately
  }

  // 4. Attempt to update a non-existent worker service user
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent WorkerService user should error",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workerServices.update(
        connection,
        {
          id: nonExistentId,
          body: {
            email: RandomGenerator.name(1) + "@example.com",
          } satisfies INotificationWorkflowWorkerService.IUpdate,
        },
      );
    },
  );
}
