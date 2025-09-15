import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";

/**
 * This test validates the retrieval of a single role permission by ID for a
 * Content Creator/Instructor user. It authenticates as a
 * contentCreatorInstructor, retrieves an existing role permission, asserts
 * correctness of returned data, and tests error handling on non-existent IDs.
 */
export async function test_api_contentcreatorinstructor_rolepermission_retrieval(
  connection: api.IConnection,
) {
  // 1. Join as contentCreatorInstructor user
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.alphaNumeric(10) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorized: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Retrieve a role permission using a simulated valid ID
  const simulatedRolePermission = typia.random<IEnterpriseLmsRolePermissions>();

  const rolePermission: IEnterpriseLmsRolePermissions =
    await api.functional.enterpriseLms.contentCreatorInstructor.rolePermissions.at(
      connection,
      {
        id: simulatedRolePermission.id,
      },
    );
  typia.assert(rolePermission);

  TestValidator.equals(
    "rolePermission id matches",
    rolePermission.id,
    simulatedRolePermission.id,
  );
  TestValidator.equals(
    "rolePermission role_id matches",
    rolePermission.role_id,
    simulatedRolePermission.role_id,
  );
  TestValidator.equals(
    "rolePermission permission_key matches",
    rolePermission.permission_key,
    simulatedRolePermission.permission_key,
  );
  TestValidator.equals(
    "rolePermission description matches",
    rolePermission.description,
    simulatedRolePermission.description ?? null,
  );
  TestValidator.equals(
    "rolePermission is_allowed boolean",
    rolePermission.is_allowed,
    simulatedRolePermission.is_allowed,
  );

  // 3. Attempt error scenario: retrieve role permission with invalid/non-existent ID
  const invalidId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "retrieving non-existent role permission throws error",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.rolePermissions.at(
        connection,
        { id: invalidId },
      );
    },
  );
}
