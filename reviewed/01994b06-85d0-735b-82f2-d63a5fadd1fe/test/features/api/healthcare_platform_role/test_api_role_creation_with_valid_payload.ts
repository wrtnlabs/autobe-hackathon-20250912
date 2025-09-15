import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate creation of a new RBAC role as a system admin with valid payload
 * and uniqueness enforcement.
 *
 * 1. Register a new system admin (email, name, password, provider: 'local').
 * 2. Login as the created admin.
 * 3. Create an RBAC role (all IHealthcarePlatformRole.ICreate required fields:
 *    code, name, scope_type, status).
 * 4. Validate the created role responds with matching values (code, name,
 *    scope_type, status).
 * 5. Attempt to create a role again with the same code and scope_type; ensure
 *    a duplicate-code error occurs (business logic validation). Notes: No
 *    type error or missing property validation. Audit log checks omitted
 *    since there is no API for them. All validations use assert and
 *    business rules only.
 */
export async function test_api_role_creation_with_valid_payload(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name,
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(join);

  // 2. Login as the system admin
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Create a new RBAC role with unique code and valid fields
  const roleCode = RandomGenerator.alphaNumeric(8);
  const roleName = RandomGenerator.name(2);
  const possibleScopes = ["platform", "organization", "department"] as const;
  const possibleStatuses = [
    "active",
    "archived",
    "retired",
    "system-only",
  ] as const;
  const scope_type = RandomGenerator.pick(possibleScopes);
  const status = RandomGenerator.pick(possibleStatuses);

  const createBody = {
    code: roleCode,
    name: roleName,
    scope_type,
    status,
  } satisfies IHealthcarePlatformRole.ICreate;

  const createdRole =
    await api.functional.healthcarePlatform.systemAdmin.roles.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRole);
  TestValidator.equals(
    "created role code matches input",
    createdRole.code,
    roleCode,
  );
  TestValidator.equals(
    "created role name matches input",
    createdRole.name,
    roleName,
  );
  TestValidator.equals(
    "created role scope_type matches input",
    createdRole.scope_type,
    scope_type,
  );
  TestValidator.equals(
    "created role status matches input",
    createdRole.status,
    status,
  );

  // 4. Attempt to create a role with duplicate code in the same scope_type (should fail)
  await TestValidator.error(
    "role creation should fail with duplicate code/scope_type",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roles.create(
        connection,
        {
          body: {
            code: roleCode,
            name: RandomGenerator.name(2),
            scope_type,
            status: RandomGenerator.pick(possibleStatuses),
          } satisfies IHealthcarePlatformRole.ICreate,
        },
      );
    },
  );
}
