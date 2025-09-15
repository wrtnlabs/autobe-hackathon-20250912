import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Validate creating a systemAdmin user via the systemAdmin role.
 *
 * This test function follows these steps:
 *
 * 1. Authenticate and join as initial systemAdmin user (required for
 *    authorization).
 * 2. Create a new systemAdmin user with valid data and verify returned properties.
 * 3. Validate error on duplicate email creation.
 * 4. Validate that unauthorized creation attempts fail.
 */
export async function test_api_systemadmin_create_systemadmin_user(
  connection: api.IConnection,
) {
  // Step 1: Join and authenticate as the initial systemAdmin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const authorizedAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // Step 2: Use authenticated connection to create new systemAdmin user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const createdAdmin: IEnterpriseLmsSystemAdmin =
    await api.functional.enterpriseLms.systemAdmin.systemadmins.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdAdmin);

  // Verify values of the created systemAdmin user
  TestValidator.predicate(
    "created user id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdAdmin.id,
    ),
  );
  TestValidator.equals(
    "created user email",
    createdAdmin.email,
    createBody.email,
  );
  TestValidator.equals(
    "created user first_name",
    createdAdmin.first_name,
    createBody.first_name,
  );
  TestValidator.equals(
    "created user last_name",
    createdAdmin.last_name,
    createBody.last_name,
  );
  TestValidator.equals("created user status", createdAdmin.status, "active");
  TestValidator.predicate(
    "created user tenant_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdAdmin.tenant_id,
    ),
  );
  TestValidator.predicate(
    "created user created_at is ISO date",
    !Number.isNaN(Date.parse(createdAdmin.created_at)),
  );
  TestValidator.predicate(
    "created user updated_at is ISO date",
    !Number.isNaN(Date.parse(createdAdmin.updated_at)),
  );

  // Step 3: Validate error on duplicate email creation
  await TestValidator.error(
    "cannot create duplicate systemAdmin email",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.create(
        connection,
        {
          body: createBody,
        },
      );
    },
  );

  // Step 4: Validate unauthorized creation attempts fail
  // Use a new connection without proper auth token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized user cannot create systemAdmin",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.create(
        unauthenticatedConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password_hash: RandomGenerator.alphaNumeric(32),
            first_name: RandomGenerator.name(),
            last_name: RandomGenerator.name(),
            status: "active",
          } satisfies IEnterpriseLmsSystemAdmin.ICreate,
        },
      );
    },
  );
}
