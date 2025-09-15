import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";

/**
 * This scenario tests the administrator login functionality through a
 * comprehensive workflow. It starts by creating a new admin user using the
 * /auth/admin/join endpoint, providing a unique email and username for
 * registration. This ensures that an admin account exists for the login
 * process. The test then performs a login with the registered credentials
 * using the /auth/admin/login endpoint, verifying that authentication
 * succeeds and that valid JWT tokens (access and refresh) are issued. The
 * tokens' structure, including expiration timestamps, is validated to
 * comply with expected ISO 8601 date-time formats. Additionally, the test
 * confirms that the returned user details, such as id (formatted UUID),
 * email, username, and timestamps (created_at, updated_at, and deleted_at
 * which can be null), conform to the contract. To ensure robustness, the
 * scenario also validates failure cases: attempting to login with an
 * incorrect password or with an email not registered in the system,
 * expecting these to produce errors. The test leverages strict TypeScript
 * typing, typia validations, and the TestValidator utilities to check
 * business logic and correct error handling. The entire process
 * demonstrates secure and correct admin authentication lifecycle including
 * account creation, login success, and failure validations.
 */
export async function test_api_admin_authentication_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin user with unique email and username
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const createBody = { email, username } satisfies IEasySignAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: createBody,
  });
  typia.assert(adminAuthorized);

  // Step 2: Validate the join response fields
  TestValidator.predicate(
    "admin id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminAuthorized.id,
    ),
  );
  TestValidator.equals(
    "admin email matches input",
    adminAuthorized.email,
    email,
  );
  TestValidator.equals(
    "admin username matches input",
    adminAuthorized.username,
    username,
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      adminAuthorized.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      adminAuthorized.updated_at,
    ),
  );

  TestValidator.predicate(
    "deleted_at is null or ISO datetime",
    adminAuthorized.deleted_at === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        adminAuthorized.deleted_at ?? "",
      ),
  );

  // Step 3: Attempt login with valid credentials
  // Assumption: backend expects password "password" for login as no password set in join
  const loginBody = {
    email,
    password: "password",
  } satisfies IEasySignAdmin.ILoginRequest;
  const loginAuthorized = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginAuthorized);

  // Step 4: Validate login response fields including tokens
  TestValidator.equals(
    "login admin id matches join",
    loginAuthorized.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "login admin email matches join",
    loginAuthorized.email,
    adminAuthorized.email,
  );
  TestValidator.equals(
    "login admin username matches join",
    loginAuthorized.username,
    adminAuthorized.username,
  );

  TestValidator.predicate(
    "login created_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginAuthorized.created_at,
    ),
  );
  TestValidator.predicate(
    "login updated_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginAuthorized.updated_at,
    ),
  );
  TestValidator.predicate(
    "login deleted_at is null or ISO datetime",
    loginAuthorized.deleted_at === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        loginAuthorized.deleted_at ?? "",
      ),
  );

  const token = loginAuthorized.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      token.refreshable_until,
    ),
  );

  // Step 5: Attempt login with invalid password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email,
        password: "wrong_password",
      } satisfies IEasySignAdmin.ILoginRequest,
    });
  });

  // Step 6: Attempt login with unregistered email
  await TestValidator.error("login fails with unregistered email", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: "unregistered@example.com",
        password: "password",
      } satisfies IEasySignAdmin.ILoginRequest,
    });
  });
}
