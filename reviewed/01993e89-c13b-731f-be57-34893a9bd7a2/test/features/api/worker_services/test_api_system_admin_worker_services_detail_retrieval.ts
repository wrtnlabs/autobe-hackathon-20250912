import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";

/**
 * Test retrieval of WorkerService details by a system administrator.
 *
 * This test verifies that a system administrator can successfully retrieve
 * detailed information about a WorkerService user identified by a UUID. It
 * includes:
 *
 * 1. Creation of a system admin user (join).
 * 2. System admin login to authenticate and acquire necessary tokens.
 * 3. Retrieval attempt for a WorkerService user details with a dummy UUID (due to
 *    lack of create API for WorkerService).
 * 4. Assertion that the retrieved data conforms to the expected WorkerService
 *    structure.
 * 5. Unauthorized retrieval attempt with an unauthenticated connection (empty
 *    headers) expecting failure.
 * 6. Retrieval with a random non-existent WorkerService UUID expecting failure.
 *
 * Note: Since no create WorkerService API is provided, this test uses a
 * randomly generated UUID to simulate existing WorkerService ID for successful
 * retrieval path. In practical environments, this may require an actual
 * WorkerService instance to be created for a truly successful retrieval.
 */
export async function test_api_system_admin_worker_services_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create system administrator by join
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password: systemAdminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Login as system admin
  const loginAuthorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdminEmail,
        password: systemAdminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
    });
  typia.assert(loginAuthorized);

  // 3. Use a dummy random UUID as workerService ID for retrieval
  // Note: No create API given for WorkerService, simulated
  const dummyWorkerServiceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. System admin retrieves WorkerService details
  const workerService: INotificationWorkflowWorkerService =
    await api.functional.notificationWorkflow.systemAdmin.workerServices.at(
      connection,
      { id: dummyWorkerServiceId },
    );
  typia.assert(workerService);

  // 5. Unauthenticated retrieval returns error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized retrieval without authentication should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workerServices.at(
        unauthConnection,
        { id: dummyWorkerServiceId },
      );
    },
  );

  // 6. Retrieval with random non-existent WorkerService ID should fail
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "retrieval with non-existent WorkerService id should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workerServices.at(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
