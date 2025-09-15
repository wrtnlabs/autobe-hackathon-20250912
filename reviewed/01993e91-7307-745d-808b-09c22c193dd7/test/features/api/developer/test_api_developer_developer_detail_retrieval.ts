import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate the retrieval of a specific developer user detailed information
 * by ID.
 *
 * This comprehensive test ensures that a developer user can be created by a
 * TPM user, that developer users can be authenticated, and that the system
 * returns accurate detailed information for a given developer ID.
 *
 * The test simulates real-world role switching and user management
 * scenarios, verifying strict schema adherence and business logic
 * correctness.
 *
 * Test steps:
 *
 * 1. TPM user registers and logs in.
 * 2. TPM user creates a developer user.
 * 3. Developer user registers and logs in.
 * 4. Retrieve developer user detailed info by ID.
 * 5. Validate all returned data matches expected values with full type safety.
 */
export async function test_api_developer_developer_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. TPM user join
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmAuthorized);

  // 2. TPM user login to set authentication context
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLoggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmLoginBody,
    });
  typia.assert(tpmLoggedIn);

  // 3. Create a developer user via TPM
  const developerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(30),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developerCreated: ITaskManagementDeveloper =
    await api.functional.taskManagement.tpm.taskManagement.developers.create(
      connection,
      {
        body: developerCreateBody,
      },
    );
  typia.assert(developerCreated);

  // 4. Developer user join with known plain password for login
  const developerPlainPassword = RandomGenerator.alphaNumeric(12);
  const developerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: developerPlainPassword,
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developerJoined: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developerJoined);

  // 5. Developer user login
  const developerLoginBody = {
    email: developerJoinBody.email,
    password: developerPlainPassword,
  } satisfies ITaskManagementDeveloper.ILogin;
  const developerLoggedIn: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLoggedIn);

  // 6. Retrieve developer detail by ID
  const developerRetrieved: ITaskManagementDeveloper =
    await api.functional.taskManagement.developer.taskManagement.developers.at(
      connection,
      {
        id: developerCreated.id,
      },
    );
  typia.assert(developerRetrieved);

  // 7. Validate that retrieved developer matches created developer
  TestValidator.equals(
    "developer id matches",
    developerRetrieved.id,
    developerCreated.id,
  );
  TestValidator.equals(
    "developer email matches",
    developerRetrieved.email,
    developerCreated.email,
  );
  TestValidator.equals(
    "developer name matches",
    developerRetrieved.name,
    developerCreated.name,
  );
  TestValidator.equals(
    "developer password_hash matches",
    developerRetrieved.password_hash,
    developerCreated.password_hash,
  );
  TestValidator.equals(
    "developer created_at matches",
    developerRetrieved.created_at,
    developerCreated.created_at,
  );
  TestValidator.equals(
    "developer updated_at matches",
    developerRetrieved.updated_at,
    developerCreated.updated_at,
  );
  TestValidator.equals(
    "developer deleted_at matches",
    developerRetrieved.deleted_at ?? null,
    developerCreated.deleted_at ?? null,
  );
}
