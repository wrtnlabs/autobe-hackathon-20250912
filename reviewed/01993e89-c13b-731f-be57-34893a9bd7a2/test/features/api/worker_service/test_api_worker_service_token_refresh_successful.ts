import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";

export async function test_api_worker_service_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new worker service user using the join endpoint
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkerService.ICreate;

  const authorized: INotificationWorkflowWorkerService.IAuthorized =
    await api.functional.auth.workerService.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Extract the current refresh token
  const oldRefreshToken = authorized.token.refresh;

  // Step 2: Use the refresh endpoint with the refresh token to obtain new tokens
  const refreshBody = {
    refresh_token: oldRefreshToken,
  } satisfies INotificationWorkflowWorkerService.IRefresh;

  const refreshed: INotificationWorkflowWorkerService.IAuthorized =
    await api.functional.auth.workerService.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Verify that the issued refresh token is different from the old one
  TestValidator.notEquals(
    "Refresh token should be renewed",
    oldRefreshToken,
    refreshed.token.refresh,
  );
}
