import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_tpm_user_creation_and_retrieve(
  connection: api.IConnection,
) {
  // 1. Authenticate existing TPM user context via /auth/tpm/join for authorization
  const tpmAuth = await api.functional.auth.tpm.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(2),
    } satisfies ITaskManagementTpm.IJoin,
  });
  typia.assert(tpmAuth);

  // 2. Create TPM user with unique email, hashed password, and name
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.ICreate;

  const createdUser =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdUser);

  // 3. Validate response properties against input and schema
  TestValidator.equals(
    "created user email matches input",
    createdUser.email,
    createBody.email,
  );
  TestValidator.equals(
    "created user name matches input",
    createdUser.name,
    createBody.name,
  );
  TestValidator.equals("deleted_at is null", createdUser.deleted_at, null);

  // 4. Confirm timestamps exist and have date-time format string
  TestValidator.predicate(
    "created_at is date-time string",
    typeof createdUser.created_at === "string" &&
      createdUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof createdUser.updated_at === "string" &&
      createdUser.updated_at.length > 0,
  );

  // 5. Attempt creating TPM user with duplicate email to verify error
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: createBody.email, // duplicate email
          password_hash: RandomGenerator.alphaNumeric(64),
          name: RandomGenerator.name(2),
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  });

  // Note: Invalid input tests are skipped due to prohibition of type error tests
}
