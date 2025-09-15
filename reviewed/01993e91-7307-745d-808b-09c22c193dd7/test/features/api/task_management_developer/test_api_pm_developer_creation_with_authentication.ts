import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * This test function performs a complete end-to-end validation of the PM user
 * creation, login, and authorized creation of a developer user.
 *
 * The test flow is:
 *
 * 1. Register a new PM user with unique email, password, and name.
 * 2. Authenticate the PM user to obtain authorization tokens.
 * 3. Using authorized context, create a new developer user with required
 *    attributes (email, password_hash, name, and active status).
 * 4. Validate the created developer user matches input and has valid UUID id.
 * 5. Negative test: unauthorized attempts to create developer should fail.
 * 6. Negative test: attempts to create developer with duplicate email should fail.
 *
 * This test ensures authorization, uniqueness, and data integrity rules.
 */
export async function test_api_pm_developer_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create a new PM user via join API
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "securePassword123!";
  const pmName = RandomGenerator.name();
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: pmName,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. Login the created PM user
  const loggedInPmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(loggedInPmUser);
  TestValidator.equals("logged in PM email", loggedInPmUser.email, pmEmail);

  // 3. Create new developer user
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password
  const developerName = RandomGenerator.name();
  const developerCreator: ITaskManagementDeveloper =
    await api.functional.taskManagement.pm.taskManagement.developers.create(
      connection,
      {
        body: {
          email: developerEmail,
          password_hash: developerPasswordHash,
          name: developerName,
          deleted_at: null,
        } satisfies ITaskManagementDeveloper.ICreate,
      },
    );
  typia.assert(developerCreator);
  TestValidator.equals(
    "developer email matches",
    developerCreator.email,
    developerEmail,
  );
  TestValidator.equals(
    "developer name matches",
    developerCreator.name,
    developerName,
  );

  // 4. Validate developer id is a UUID string
  TestValidator.predicate(
    "developer id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      developerCreator.id,
    ),
  );

  // 5. Negative test: attempt creating developer without authentication - expect error
  await TestValidator.error(
    "creates developer without login should fail",
    async () => {
      const unauthConn: api.IConnection = { ...connection, headers: {} };
      await api.functional.taskManagement.pm.taskManagement.developers.create(
        unauthConn,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password_hash: RandomGenerator.alphaNumeric(64),
            name: RandomGenerator.name(),
          } satisfies ITaskManagementDeveloper.ICreate,
        },
      );
    },
  );

  // 6. Negative test: attempt to create developer with duplicate email - expect error
  await TestValidator.error(
    "creating developer with duplicate email should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.developers.create(
        connection,
        {
          body: {
            email: developerEmail, // duplicate
            password_hash: RandomGenerator.alphaNumeric(64),
            name: RandomGenerator.name(),
          } satisfies ITaskManagementDeveloper.ICreate,
        },
      );
    },
  );
}
