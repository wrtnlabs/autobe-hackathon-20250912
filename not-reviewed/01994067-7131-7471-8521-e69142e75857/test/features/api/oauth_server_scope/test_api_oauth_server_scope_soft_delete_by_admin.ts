import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";

/**
 * This e2e test validates the full workflow for soft deletion of an OAuth scope
 * by an admin.
 *
 * Steps:
 *
 * 1. Admin signs up and logs in to receive authorization token.
 * 2. Admin creates a new OAuth scope.
 * 3. Admin soft deletes the created scope by ID.
 * 4. Verify deletion by the fact API does not return data (void), and handling
 *    double deletion errors.
 * 5. Attempt to delete a non-existent scope and expect failure.
 * 6. Attempt to delete with unauthorized connection and expect failure.
 *
 * Validates authorization, soft deletion behavior, error handling, and data
 * integrity.
 */
export async function test_api_oauth_server_scope_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "validPassword123";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new OAuth scope
  // Choose random code and description
  const scopeCode = RandomGenerator.alphaNumeric(8);
  const scopeDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createdScope: IOauthServerScope =
    await api.functional.oauthServer.admin.scopes.create(connection, {
      body: {
        code: scopeCode,
        description: scopeDescription,
      } satisfies IOauthServerScope.ICreate,
    });
  typia.assert(createdScope);
  TestValidator.equals(
    "created scope code matches",
    createdScope.code,
    scopeCode,
  );
  TestValidator.equals(
    "created scope description matches",
    createdScope.description,
    scopeDescription,
  );
  TestValidator.predicate(
    "created scope deleted_at is null or undefined",
    createdScope.deleted_at === null || createdScope.deleted_at === undefined,
  );

  // 3. Soft delete the scope
  await api.functional.oauthServer.admin.scopes.erase(connection, {
    id: createdScope.id,
  });

  // 4. Attempt to delete the same scope again, expect error
  await TestValidator.error(
    "deleting same scope again should fail",
    async () => {
      await api.functional.oauthServer.admin.scopes.erase(connection, {
        id: createdScope.id,
      });
    },
  );

  // 5. Attempt to delete a non-existent scope id, expect error
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent scope should fail",
    async () => {
      await api.functional.oauthServer.admin.scopes.erase(connection, {
        id: randomNonExistentId,
      });
    },
  );

  // 6. Attempt to delete a scope without authentication (unauth connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "deleting scope without authentication should fail",
    async () => {
      await api.functional.oauthServer.admin.scopes.erase(
        unauthenticatedConnection,
        {
          id: createdScope.id,
        },
      );
    },
  );
}
