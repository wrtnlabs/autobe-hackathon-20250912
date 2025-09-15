import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the robustness of the TPM notification preferences
 * search API against edge cases.
 *
 * Starting with user registration and login for the TPM role, it validates
 * that searching with empty preference keys, invalid delivery methods, and
 * very large pagination parameters returns stable and valid pagination
 * results without errors.
 *
 * The test verifies that the API rejects unauthorized access attempts,
 * ensuring authorization is correctly enforced.
 *
 * Methodology:
 *
 * 1. Register a new TPM user (join) and assert authorization.
 * 2. Log in with the TPM user credentials and assert authorization.
 * 3. Execute PATCH searches on notification preferences with edge case
 *    filters:
 *
 *    - Empty preference_key string.
 *    - Invalid delivery_method string "invalid-method".
 *    - Very large page and limit numbers to test pagination limits.
 *    - Filtering enabled property to true and then false.
 * 4. For each search, validate the response structure and include pagination
 *    info. Also validate pagination counts and pages.
 * 5. Attempt search without authentication to confirm authorization failure.
 */
export async function test_api_tpm_notification_preferences_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new TPM user and assert authorization
  const joinBody = {
    email: (RandomGenerator.alphaNumeric(10) + "@example.com").toLowerCase(),
    password: "Passw0rd!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;

  const joinResponse = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResponse);

  // 2. Log in with the TPM user credentials and assert authorization
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginResponse = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResponse);

  // 3. Define edge case request filters
  const requests: ITaskManagementNotificationPreferences.IRequest[] = [
    { preference_key: "" },
    { delivery_method: "invalid-method" },
    {
      page: 1000000 satisfies number & tags.Type<"int32">,
      limit: 1000000 satisfies number & tags.Type<"int32">,
    },
    { enabled: true },
    { enabled: false },
  ];

  // 4. Send queries using authenticated connection and assert response
  for (const req of requests) {
    const response =
      await api.functional.taskManagement.tpm.notificationPreferences.indexNotificationPreferences(
        connection,
        {
          body: req,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      "Pagination info present",
      response.pagination !== null && response.pagination !== undefined,
    );
    TestValidator.predicate(
      "Pagination records count is non-negative",
      typeof response.pagination.records === "number" &&
        response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "Pagination pages count is non-negative",
      typeof response.pagination.pages === "number" &&
        response.pagination.pages >= 0,
    );
  }

  // 5. Attempt search without authentication and confirm failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("Unauthorized search should fail", async () => {
    await api.functional.taskManagement.tpm.notificationPreferences.indexNotificationPreferences(
      unauthenticatedConnection,
      {
        body: {}, // IRequest has all optional fields, so empty body allowed
      },
    );
  });
}
