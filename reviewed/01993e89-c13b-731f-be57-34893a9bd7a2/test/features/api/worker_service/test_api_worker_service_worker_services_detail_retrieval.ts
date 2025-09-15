import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";

/**
 * Validate retrieval of worker service user detail by unique ID.
 *
 * This test covers:
 *
 * 1. Creating a worker service user by joining via /auth/workerService/join
 * 2. Retrieving the created user's details via
 *    /notificationWorkflow/workerService/workerServices/{id}
 * 3. Unauthorized access attempt to the detail endpoint
 * 4. Attempt to retrieve a non-existent user by random UUID
 */
export async function test_api_worker_service_worker_services_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a worker service user and authenticate
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkerService.ICreate;

  const authorized: INotificationWorkflowWorkerService.IAuthorized =
    await api.functional.auth.workerService.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Retrieve detail with authenticated connection
  const detail: INotificationWorkflowWorkerService =
    await api.functional.notificationWorkflow.workerService.workerServices.at(
      connection,
      { id: authorized.id },
    );
  typia.assert(detail);

  // Validate fields match expected
  TestValidator.equals("id matches", detail.id, authorized.id);
  TestValidator.equals("email matches", detail.email, authorized.email);
  TestValidator.equals(
    "password_hash matches",
    detail.password_hash,
    authorized.password_hash,
  );
  TestValidator.equals(
    "created_at matches",
    detail.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    detail.updated_at,
    authorized.updated_at,
  );

  // deleted_at may be null or undefined, normalize for comparison
  const deletedAtAuthorized =
    authorized.deleted_at === undefined ? null : authorized.deleted_at;
  const deletedAtDetail =
    detail.deleted_at === undefined ? null : detail.deleted_at;
  TestValidator.equals(
    "deleted_at matches",
    deletedAtDetail,
    deletedAtAuthorized,
  );

  // 3. Unauthorized access should error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to workerService detail",
    async () => {
      await api.functional.notificationWorkflow.workerService.workerServices.at(
        unauthenticatedConnection,
        { id: authorized.id },
      );
    },
  );

  // 4. Not found error when random UUID used
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "workerService detail with random id not found",
    async () => {
      await api.functional.notificationWorkflow.workerService.workerServices.at(
        connection,
        { id: randomId },
      );
    },
  );
}
