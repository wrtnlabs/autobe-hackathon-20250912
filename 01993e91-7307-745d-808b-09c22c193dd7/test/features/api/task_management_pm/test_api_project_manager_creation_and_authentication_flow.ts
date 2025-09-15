import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

export async function test_api_project_manager_creation_and_authentication_flow(
  connection: api.IConnection,
) {
  // 1. Register a new PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "StrongPassword123!";
  const pmName = RandomGenerator.name();

  const registeredPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: pmName,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(registeredPm);

  TestValidator.equals(
    "registered PM email matches input",
    registeredPm.email,
    pmEmail,
  );
  TestValidator.equals(
    "registered PM name matches input",
    registeredPm.name,
    pmName,
  );
  TestValidator.predicate(
    "registered PM has id",
    typeof registeredPm.id === "string" && registeredPm.id.length > 0,
  );
  TestValidator.predicate(
    "registered PM password_hash is string",
    typeof registeredPm.password_hash === "string" &&
      registeredPm.password_hash.length > 0,
  );

  // 2. Login as the newly registered PM
  const loggedInPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(loggedInPm);

  TestValidator.equals("login email matches", loggedInPm.email, pmEmail);
  TestValidator.equals("login name matches", loggedInPm.name, pmName);
  TestValidator.predicate(
    "login token access is non empty string",
    typeof loggedInPm.token.access === "string" &&
      loggedInPm.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh is non empty string",
    typeof loggedInPm.token.refresh === "string" &&
      loggedInPm.token.refresh.length > 0,
  );

  // 3. Use login authorization context to create another PM user
  //    Here, create distinct email and name
  const newPmEmail = typia.random<string & tags.Format<"email">>();
  const newPmPassword = "NewStrongPass456!";
  const newPmName = RandomGenerator.name();

  const newPmUser: ITaskManagementPm =
    await api.functional.taskManagement.pm.taskManagement.pms.create(
      connection,
      {
        body: {
          email: newPmEmail,
          password: newPmPassword,
          name: newPmName,
        } satisfies ITaskManagementPm.ICreate,
      },
    );
  typia.assert(newPmUser);

  TestValidator.equals(
    "new PM email matches input",
    newPmUser.email,
    newPmEmail,
  );
  TestValidator.equals("new PM name matches input", newPmUser.name, newPmName);
  TestValidator.predicate(
    "new PM id is a string",
    typeof newPmUser.id === "string" && newPmUser.id.length > 0,
  );
  TestValidator.predicate(
    "new PM password_hash exists",
    typeof newPmUser.password_hash === "string" &&
      newPmUser.password_hash.length > 0,
  );
  TestValidator.predicate(
    "new PM created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(newPmUser.created_at),
  );
  TestValidator.predicate(
    "new PM updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(newPmUser.updated_at),
  );
  TestValidator.equals(
    "new PM deleted_at is explicit null",
    newPmUser.deleted_at,
    null,
  );

  // 4. Attempt to create PM user with duplicate email - expect error
  await TestValidator.error(
    "creating duplicate email PM user should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.pms.create(
        connection,
        {
          body: {
            email: newPmEmail,
            password: "SomeOtherPass789!",
            name: RandomGenerator.name(),
          } satisfies ITaskManagementPm.ICreate,
        },
      );
    },
  );

  // 5. Attempt creating PM user without login - unauthorized error
  //    Creating a new unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "creating PM user without token authorization should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.pms.create(
        unauthenticatedConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "UnauthorizedPass1!",
            name: RandomGenerator.name(),
          } satisfies ITaskManagementPm.ICreate,
        },
      );
    },
  );

  // 6. Skip invalid token creation test due to header manipulation prohibition
  //    and lack of logout or token invalidation API.
}
