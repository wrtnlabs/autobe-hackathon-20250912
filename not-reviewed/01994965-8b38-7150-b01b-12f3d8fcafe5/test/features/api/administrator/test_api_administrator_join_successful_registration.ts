import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Test the full flow of administrator registration including successful
 * creation with valid email and password hash and handling duplicate email
 * registration and validation errors. The flow tests that the POST
 * /auth/administrator/join endpoint registers an administrator without prior
 * authentication, returning authorized administrator data with UUID id, email,
 * hashed password, created_at and updated_at timestamps, deleted_at set to
 * null, and JWT authorization tokens. It also validates error scenarios such as
 * registration with duplicate email failure, invalid email format, and weak
 * password. Validation ensures timestamps are ISO 8601 date-time strings and
 * deleted_at is null for active records. This process confirms correct
 * administrator creation, token issuance, and enforcement of uniqueness and
 * format validation, excluding any type error or missing required property
 * tests as prohibited.
 */
export async function test_api_administrator_join_successful_registration(
  connection: api.IConnection,
) {
  // 1. Generate a random valid email and password hash
  const email: string = typia.random<string & tags.Format<"email">>();
  // For password_hash, since it's a hash, simulate a securely hashed string
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // Typical SHA-256 hex hash length

  // 2. Call the join API with generated email and password hash
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 3. Validate the response fields
  TestValidator.predicate(
    "admin id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      admin.id,
    ),
  );
  TestValidator.equals("admin email matches", admin.email, email);
  TestValidator.equals(
    "admin password_hash matches",
    admin.password_hash,
    passwordHash,
  );

  // 4. Validate timestamp formats
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(admin.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(admin.updated_at),
  );

  // 5. Ensure deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    admin.deleted_at === null || admin.deleted_at === undefined,
  );

  // 6. Validate token object properties
  typia.assert(admin.token);
  TestValidator.predicate(
    "token access is non-empty string",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof admin.token.refresh === "string" && admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      admin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      admin.token.refreshable_until,
    ),
  );

  // 7. Test duplicate email registration error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email,
          password_hash: RandomGenerator.alphaNumeric(64),
        } satisfies ITelegramFileDownloaderAdministrator.ICreate,
      });
    },
  );

  // 8. Test invalid email format error
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: "invalid-email-format",
        password_hash: RandomGenerator.alphaNumeric(64),
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  });

  // 9. Test weak password hash error (simulate short hash)
  await TestValidator.error(
    "weak password hash (too short) should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: "short",
        } satisfies ITelegramFileDownloaderAdministrator.ICreate,
      });
    },
  );
}
