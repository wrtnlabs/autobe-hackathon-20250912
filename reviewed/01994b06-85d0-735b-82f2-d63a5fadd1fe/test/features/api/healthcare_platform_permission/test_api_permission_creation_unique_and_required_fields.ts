import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test permission creation as system admin, enforcing required fields,
 * uniqueness, and authorization.
 *
 * 1. Register a new system admin to get an authenticated context.
 * 2. Create a new permission with valid fields.
 * 3. Attempt to create a duplicate permission (same code & scope_type) and expect
 *    error.
 * 4. Try an illegal value for scope_type – expect error.
 * 5. Attempt creation without system admin authentication – should fail.
 */
export async function test_api_permission_creation_unique_and_required_fields(
  connection: api.IConnection,
) {
  // 1. Register system admin (dependency)
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a permission (with required and valid fields)
  const permissionInput = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    scope_type: RandomGenerator.pick([
      "platform",
      "organization",
      "department",
    ] as const),
    status: RandomGenerator.pick(["active", "retired", "system"] as const),
  } satisfies IHealthcarePlatformPermission.ICreate;

  const permission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.create(
      connection,
      {
        body: permissionInput,
      },
    );
  typia.assert(permission);
  TestValidator.equals(
    "permission code matches",
    permission.code,
    permissionInput.code,
  );
  TestValidator.equals(
    "permission scope matches",
    permission.scope_type,
    permissionInput.scope_type,
  );

  // 3. Try creating duplicate permission (same code & scope_type)
  await TestValidator.error(
    "duplicate code/scope_type triggers error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.create(
        connection,
        {
          body: permissionInput,
        },
      );
    },
  );

  // 4. Illegal scope_type value
  await TestValidator.error("illegal scope_type triggers error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.permissions.create(
      connection,
      {
        body: {
          ...permissionInput,
          scope_type: "illegal_scope_value",
        } satisfies IHealthcarePlatformPermission.ICreate,
      },
    );
  });

  // 5. Without admin authentication: simulate as unauthenticated
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot create permission",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.create(
        unauthConnection,
        {
          body: permissionInput,
        },
      );
    },
  );
}
