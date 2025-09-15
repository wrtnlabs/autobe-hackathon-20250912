import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_join_successful_registration(
  connection: api.IConnection,
) {
  // Generate unique user registration data
  const email = `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@example.com`;
  const username = `${RandomGenerator.name(1).replace(/ /g, "")}${RandomGenerator.alphaNumeric(3)}`;
  const password_hash = RandomGenerator.alphaNumeric(64); // Simulate a hashed password

  // Compose request body according to IRecipeSharingRegularUser.ICreate
  const requestBody = {
    email,
    password_hash,
    username,
  } satisfies IRecipeSharingRegularUser.ICreate;

  // Call the join API endpoint
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: requestBody,
    });
  // Validate response structure and type
  typia.assert(authorizedUser);

  // Validations for mandatory fields
  TestValidator.predicate(
    `'id' is a non-empty UUID string`,
    typeof authorizedUser.id === "string" && authorizedUser.id.length > 0,
  );
  TestValidator.equals(
    `registered email matches input`,
    authorizedUser.email,
    email,
  );
  TestValidator.equals(
    `registered username matches input`,
    authorizedUser.username,
    username,
  );
  TestValidator.equals(
    `password_hash is returned as provided`,
    authorizedUser.password_hash,
    password_hash,
  );

  // Validate timestamps format and presence
  TestValidator.predicate(
    `'created_at' is a string and contains 'T'`,
    typeof authorizedUser.created_at === "string" &&
      authorizedUser.created_at.includes("T"),
  );
  TestValidator.predicate(
    `'updated_at' is a string and contains 'T'`,
    typeof authorizedUser.updated_at === "string" &&
      authorizedUser.updated_at.includes("T"),
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    `'deleted_at' is null or undefined`,
    authorizedUser.deleted_at === null ||
      authorizedUser.deleted_at === undefined,
  );

  // Verify token object and its properties
  TestValidator.predicate(
    `'token' object exists`,
    typeof authorizedUser.token === "object" && authorizedUser.token !== null,
  );
  TestValidator.predicate(
    `'token.access' is non-empty string`,
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    `'token.refresh' is non-empty string`,
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    `'token.expired_at' is a string and contains 'T'`,
    typeof authorizedUser.token.expired_at === "string" &&
      authorizedUser.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    `'token.refreshable_until' is a string and contains 'T'`,
    typeof authorizedUser.token.refreshable_until === "string" &&
      authorizedUser.token.refreshable_until.includes("T"),
  );
}
