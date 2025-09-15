import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test retrieving detailed information of a specific system administrator
 * by their unique ID.
 *
 * This test performs a complete user registration and login flow for a
 * system administrator, then retrieves the system admin's detailed
 * information using the specific ID endpoint. It additionally tests error
 * handling for invalid IDs and unauthorized access.
 */
export async function test_api_systemadmin_retrieve_systemadmin_detail(
  connection: api.IConnection,
) {
  // 1. Register a new systemAdmin user
  const createBody = {
    email: `sa-${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const created: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Login as the created systemAdmin
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Retrieve detailed information by systemadminId
  const retrieved: IEnterpriseLmsSystemAdmin =
    await api.functional.enterpriseLms.systemAdmin.systemadmins.at(connection, {
      systemadminId: created.id,
    });
  typia.assert(retrieved);

  // 4. Validate returned details
  TestValidator.equals("email matches", retrieved.email, createBody.email);
  TestValidator.equals("status matches", retrieved.status, createBody.status);
  TestValidator.equals(
    "first_name matches",
    retrieved.first_name,
    createBody.first_name,
  );
  TestValidator.equals(
    "last_name matches",
    retrieved.last_name,
    createBody.last_name,
  );
  TestValidator.equals(
    "tenant_id matches",
    retrieved.tenant_id,
    created.tenant_id,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      retrieved.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      retrieved.updated_at,
    ),
  );

  // 5. Negative test: invalid/non-existent systemadminId
  await TestValidator.error(
    "should fail fetching non-existent systemadminId",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.at(
        connection,
        {
          systemadminId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Negative test: unauthorized access (use a fresh connection without login)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("should reject unauthorized access", async () => {
    await api.functional.enterpriseLms.systemAdmin.systemadmins.at(unauthConn, {
      systemadminId: created.id,
    });
  });
}
