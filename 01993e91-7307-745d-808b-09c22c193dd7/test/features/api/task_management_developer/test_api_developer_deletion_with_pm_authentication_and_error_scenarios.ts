import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Tests the deletion workflow of developer users by authenticated PM users.
 *
 * This test covers:
 *
 * 1. PM user registration and login to obtain authentication.
 * 2. Creation of a developer user with valid data.
 * 3. Successful deletion of the developer user by the PM.
 * 4. Negative tests for deletion failures:
 *
 *    - Deletion with a random invalid developer ID.
 *    - Deletion attempt without authentication.
 *
 * The test verifies role-based access control, proper error handling, and
 * data integrity enforcement during developer deletion operations.
 *
 * All ID and email formats are respected according to schema constraints.
 * Authentication tokens are managed automatically by SDK calls.
 */
export async function test_api_developer_deletion_with_pm_authentication_and_error_scenarios(
  connection: api.IConnection,
) {
  // 1. PM user signs up with valid email, password, and name.
  const pmEmail: string = typia.random<string & tags.Format<"email">>();
  const pmPassword = "strongpassword123";
  const pmName: string = RandomGenerator.name();
  const pmAuth: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: pmName,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmAuth);

  // 2. PM user logs in to retrieve authentication tokens.
  const pmLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(pmLogin);

  // 3. Create a developer user with valid data.
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPassHash: string = RandomGenerator.alphaNumeric(64);
  const developerName: string = RandomGenerator.name();

  const developer: ITaskManagementDeveloper =
    await api.functional.taskManagement.pm.taskManagement.developers.create(
      connection,
      {
        body: {
          email: developerEmail,
          password_hash: developerPassHash,
          name: developerName,
          deleted_at: null,
        } satisfies ITaskManagementDeveloper.ICreate,
      },
    );
  typia.assert(developer);

  // 4. Delete developer user with PM authentication.
  await api.functional.taskManagement.pm.taskManagement.developers.erase(
    connection,
    {
      id: developer.id,
    },
  );

  // 5. Negative test: deleting with an invalid developer ID should fail.
  await TestValidator.error(
    "deleting developer with invalid ID should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.developers.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(), // random UUID not existing
        },
      );
    },
  );

  // 6. Negative test: attempting deletion without authentication should fail.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated deleting developer should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.developers.erase(
        unauthConn,
        {
          id: developer.id,
        },
      );
    },
  );
}
