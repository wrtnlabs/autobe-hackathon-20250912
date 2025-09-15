import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Test the Project Manager (PM) user authentication and creation flows.
 *
 * Due to the absence of a listing API for PM users, this test focuses on:
 *
 * 1. Authenticating a PM user using the join API
 * 2. Creating multiple PM users to simulate user creation
 * 3. Confirming unauthorized access is rejected when creating PM users without
 *    auth
 *
 * Note: This scenario has been REWRITTEN to exclude listing tests due to
 * missing API.
 */
export async function test_api_task_management_pm_pms_list_with_valid_authorization_and_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate as PM user to obtain authorization token
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = RandomGenerator.alphaNumeric(10);

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmAuthorized);
  TestValidator.predicate(
    "Authenticated PM user has non-empty token.access",
    pmAuthorized.token.access.length > 0,
  );

  // 2. Create multiple PM users for creation flow verification
  const pmUserCount = 3;
  const createdPMUsers: ITaskManagementPm[] = [];
  for (let i = 0; i < pmUserCount; ++i) {
    const newPmCreateBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies ITaskManagementPm.ICreate;

    const createdPmUser =
      await api.functional.taskManagement.pm.taskManagement.pms.create(
        connection,
        {
          body: newPmCreateBody,
        },
      );
    typia.assert(createdPmUser);
    createdPMUsers.push(createdPmUser);
  }

  // 3. Confirm unauthorized create fails
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized create PM fails", async () => {
    await api.functional.taskManagement.pm.taskManagement.pms.create(
      unauthConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
        } satisfies ITaskManagementPm.ICreate,
      },
    );
  });

  // Validate created PM users count
  TestValidator.equals(
    "created PM users count",
    createdPMUsers.length,
    pmUserCount,
  );
}
