import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Tests successful registration of a new FlexOffice admin account.
 *
 * This test validates the following:
 *
 * - Creating a new admin with a unique and valid email.
 * - Using a secure password compliant with expected password policies.
 * - Receiving a valid authorization response containing JWT tokens.
 * - Handling duplicate email registration with a 409 conflict error.
 * - Handling weak or invalid password registrations with 400 validation errors.
 * - Implicit validation of password hash storage and audit fields in backend.
 *
 * Workflow:
 *
 * 1. Generate random email and password.
 * 2. Register new admin and assert response.
 * 3. Attempt duplicate registration and assert error.
 * 4. Attempt invalid password registrations and assert errors.
 */
export async function test_api_flexoffice_admin_join_success(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique email and secure password
  const email = `${RandomGenerator.name(2).replace(/\s+/g, ".")}@example.com`;
  const password = `S3cureP@ss${RandomGenerator.alphaNumeric(5)}`;

  // Step 2: Register new admin
  const createBody = {
    email,
    password,
  } satisfies IFlexOfficeAdmin.ICreate;
  const authorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(authorized);

  TestValidator.predicate(
    "admin id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "token access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // Step 3: Attempt duplicate registration - expect 409 Conflict error
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.admin.join(connection, { body: createBody });
  });

  // Step 4: Attempt registration with weak/invalid passwords
  const invalidPasswords = ["123", "password", "admin", "qwerty"];
  for (const weakPassword of invalidPasswords) {
    const weakBody = {
      email: `${RandomGenerator.name(2).replace(/\s+/g, ".")}@example.com`,
      password: weakPassword,
    } satisfies IFlexOfficeAdmin.ICreate;

    await TestValidator.error(
      `weak password "${weakPassword}" should fail`,
      async () => {
        await api.functional.auth.admin.join(connection, { body: weakBody });
      },
    );
  }
}
