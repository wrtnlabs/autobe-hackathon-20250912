import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Tests end-to-end scenario of PMO user creating a developer user.
 *
 * 1. Registers a PMO via /auth/pmo/join
 * 2. Logs in as PMO via /auth/pmo/login
 * 3. Using the authenticated PMO, creates a developer user with email, hashed
 *    password, name, and no deletion timestamp
 * 4. Validates response structures and essential properties
 *
 * Validates authorization, type conformity, and security practices.
 */
export async function test_api_developer_creation_by_pmo_user(
  connection: api.IConnection,
) {
  // 1. PMO Join: register new PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "secure_plain_password_1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoJoined: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoJoined);

  // 2. PMO Login: authenticate using join credentials
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLoggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLoggedIn);

  // 3. Developer create: create new developer user with required fields
  // Simulate password_hash as random string to imitate a secure hashed password
  const devCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const createdDeveloper: ITaskManagementDeveloper =
    await api.functional.taskManagement.pmo.taskManagement.developers.create(
      connection,
      { body: devCreateBody },
    );
  typia.assert(createdDeveloper);

  // 4. Validate key properties
  TestValidator.predicate(
    "created developer has UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdDeveloper.id,
    ),
  );
  TestValidator.equals(
    "created developer email matches input",
    createdDeveloper.email,
    devCreateBody.email,
  );
  TestValidator.equals(
    "created developer name matches input",
    createdDeveloper.name,
    devCreateBody.name,
  );
  TestValidator.predicate(
    "created developer password_hash length is valid",
    createdDeveloper.password_hash.length >= 60,
  );
  TestValidator.equals(
    "created developer deleted_at is null or undefined",
    createdDeveloper.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "created and updated timestamps are ISO strings",
    typeof createdDeveloper.created_at === "string" &&
      typeof createdDeveloper.updated_at === "string",
  );
}
