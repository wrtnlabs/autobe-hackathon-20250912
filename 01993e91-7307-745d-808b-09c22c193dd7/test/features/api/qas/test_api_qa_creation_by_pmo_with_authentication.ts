import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * E2E test for creation of QA user by an authenticated PMO user.
 *
 * This test performs full authentication cycle for a PMO user who then creates
 * a QA user, verifying successful creation, duplicate email rejection, and
 * unauthorized access rejection.
 */
export async function test_api_qa_creation_by_pmo_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create PMO user with valid join data
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // plaintext password
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  // 2. Login PMO user to obtain tokens
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoUserLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: pmoLoginBody,
    });
  typia.assert(pmoUserLogin);

  // 3. Prepare QA user creation data
  const qaCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64), // hashed password format
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  // 4. Create QA user as authorized PMO
  const qaUser: ITaskManagementQa =
    await api.functional.taskManagement.pmo.taskManagement.qas.create(
      connection,
      {
        body: qaCreateBody,
      },
    );
  typia.assert(qaUser);

  // Validate created QA user's fields
  TestValidator.equals(
    "qa user email matches input",
    qaUser.email,
    qaCreateBody.email,
  );
  TestValidator.equals(
    "qa user name matches input",
    qaUser.name,
    qaCreateBody.name,
  );

  // 5. Test duplicate email error when creating QA with existing email
  await TestValidator.error("duplicate email creation fails", async () => {
    await api.functional.taskManagement.pmo.taskManagement.qas.create(
      connection,
      {
        body: {
          email: qaCreateBody.email, // duplicate email
          password_hash: RandomGenerator.alphaNumeric(64),
          name: RandomGenerator.name(),
        } satisfies ITaskManagementQa.ICreate,
      },
    );
  });

  // 6. Test unauthorized access rejection by using a fresh connection without auth
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized qa creation fails", async () => {
    await api.functional.taskManagement.pmo.taskManagement.qas.create(
      unauthConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: RandomGenerator.alphaNumeric(64),
          name: RandomGenerator.name(),
        } satisfies ITaskManagementQa.ICreate,
      },
    );
  });
}
