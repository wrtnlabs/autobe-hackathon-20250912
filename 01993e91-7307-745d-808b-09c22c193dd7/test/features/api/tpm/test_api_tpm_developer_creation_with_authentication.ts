import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate creating a developer user with TPM authentication.
 *
 * This test covers full secured workflow:
 *
 * 1. TPM user is registered via /auth/tpm/join
 * 2. TPM user logs in via /auth/tpm/login, setting auth headers
 * 3. Authenticated TPM user creates a new developer user
 * 4. Validates the returned developer user matches input data
 * 5. Tests error when creating a developer user with duplicate email
 */
export async function test_api_tpm_developer_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. TPM user join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(tpmUser);

  // 2. TPM user login to set authentication header properly
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(tpmLogin);

  // 3. Create developer user
  const developerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const developer: ITaskManagementDeveloper =
    await api.functional.taskManagement.tpm.taskManagement.developers.create(
      connection,
      {
        body: developerBody,
      },
    );
  typia.assert(developer);

  // 4. Validate returned data matches input data (excluding password_hash)
  TestValidator.equals("developer email", developer.email, developerBody.email);
  TestValidator.equals("developer name", developer.name, developerBody.name);
  TestValidator.equals(
    "developer deleted_at is null",
    developer.deleted_at,
    null,
  );

  // 5. Test creating developer user with duplicate email triggers error
  await TestValidator.error(
    "creating developer with duplicate email should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.developers.create(
        connection,
        {
          body: {
            email: developerBody.email,
            password_hash: RandomGenerator.alphaNumeric(64),
            name: RandomGenerator.name(),
            deleted_at: null,
          } satisfies ITaskManagementDeveloper.ICreate,
        },
      );
    },
  );
}
