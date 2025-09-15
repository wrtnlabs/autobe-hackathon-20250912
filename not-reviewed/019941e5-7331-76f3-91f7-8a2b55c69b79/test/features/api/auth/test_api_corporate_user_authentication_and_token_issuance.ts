import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignCorporateUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignCorporateUser";

export async function test_api_corporate_user_authentication_and_token_issuance(
  connection: api.IConnection,
) {
  // Generate login credentials for a corporate user with realistic email
  const loginBody = {
    email:
      RandomGenerator.name(1).toLowerCase().replace(/ /g, "") + "@company.com",
    password: "P@ssw0rd!",
  } satisfies IEasySignCorporateUser.ILogin;

  // Call the login API to obtain the authorized corporate user info
  const authorizedUser: IEasySignCorporateUser.IAuthorized =
    await api.functional.auth.corporateUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorizedUser);

  // Validate that the id is a valid UUID string
  TestValidator.predicate(
    "valid UUID for id",
    typeof authorizedUser.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        authorizedUser.id,
      ),
  );

  // Validate email contains '@'
  TestValidator.predicate(
    "email contains '@'",
    typeof authorizedUser.email === "string" &&
      authorizedUser.email.includes("@"),
  );

  // Validate company_name is a non-empty string
  TestValidator.predicate(
    "company_name is non-empty string",
    typeof authorizedUser.company_name === "string" &&
      authorizedUser.company_name.length > 0,
  );

  // Validate department is string or null or undefined (optional)
  TestValidator.predicate(
    "department is string or null or undefined",
    authorizedUser.department === null ||
      authorizedUser.department === undefined ||
      typeof authorizedUser.department === "string",
  );

  // Validate position is string or null or undefined (optional)
  TestValidator.predicate(
    "position is string or null or undefined",
    authorizedUser.position === null ||
      authorizedUser.position === undefined ||
      typeof authorizedUser.position === "string",
  );

  // created_at and updated_at must be valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof authorizedUser.created_at === "string" &&
      !isNaN(Date.parse(authorizedUser.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof authorizedUser.updated_at === "string" &&
      !isNaN(Date.parse(authorizedUser.updated_at)),
  );

  // deleted_at is optional nullable ISO 8601 date-time string
  if (
    authorizedUser.deleted_at !== null &&
    authorizedUser.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date-time",
      typeof authorizedUser.deleted_at === "string" &&
        !isNaN(Date.parse(authorizedUser.deleted_at)),
    );
  }

  // Validate token object existence and properties
  TestValidator.predicate(
    "token object exists",
    authorizedUser.token !== null && typeof authorizedUser.token === "object",
  );
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO date-time",
    typeof authorizedUser.token.expired_at === "string" &&
      !isNaN(Date.parse(authorizedUser.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO date-time",
    typeof authorizedUser.token.refreshable_until === "string" &&
      !isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );
}
