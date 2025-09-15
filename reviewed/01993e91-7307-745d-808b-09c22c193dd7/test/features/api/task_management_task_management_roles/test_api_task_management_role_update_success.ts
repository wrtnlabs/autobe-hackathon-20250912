import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_role_update_success(
  connection: api.IConnection,
) {
  // 1. TPM user registration (join)
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPassword!123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  // 2. TPM user login to get fresh tokens
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLogin = await api.functional.auth.tpm.login(connection, {
    body: tpmLoginBody,
  });
  typia.assert(tpmLogin);

  // 3. Create initial task management role
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskManagementRoles.ICreate;

  const createdRole =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(createdRole);

  // 4. Prepare update data with new valid values
  const updateBody = {
    code: RandomGenerator.alphaNumeric(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementTaskManagementRoles.IUpdate;

  // 5. Update the created role
  const updatedRole =
    await api.functional.taskManagement.tpm.taskManagementRoles.update(
      connection,
      {
        id: createdRole.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);

  // 6. Validate that the returned role fields match update data exactly
  TestValidator.equals(
    "updated role code equals",
    updatedRole.code,
    updateBody.code,
  );
  TestValidator.equals(
    "updated role name equals",
    updatedRole.name,
    updateBody.name,
  );

  // For description, allow for null or string and compare explicitly
  TestValidator.equals(
    "updated role description equals",
    updatedRole.description ?? null,
    updateBody.description ?? null,
  );

  // 7. Validate the role ID remains unchanged
  TestValidator.equals(
    "role ID unchanged after update",
    updatedRole.id,
    createdRole.id,
  );
}
