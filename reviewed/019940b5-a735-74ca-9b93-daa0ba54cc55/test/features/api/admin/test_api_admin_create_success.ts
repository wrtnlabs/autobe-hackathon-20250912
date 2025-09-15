import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

export async function test_api_admin_create_success(
  connection: api.IConnection,
) {
  // 1. Create initial admin user by calling the authentication join endpoint
  const initialAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const initialAdminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: initialAdminEmail,
        password_hash: RandomGenerator.alphaNumeric(64), // Simulated hashed password
        full_name: RandomGenerator.name(3),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(
          6,
        )}/200/200`,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(initialAdminUser);

  // 2. Login with initial admin credentials to set admin authentication context
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: initialAdminEmail,
        password_hash: initialAdminUser.password_hash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new admin user with complete valid details
  const newAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const createdAdmin: IEventRegistrationAdmin =
    await api.functional.eventRegistration.admin.admins.create(connection, {
      body: {
        email: newAdminEmail,
        password_hash: RandomGenerator.alphaNumeric(64), // Simulated hashed password
        full_name: RandomGenerator.name(3),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(
          6,
        )}/200/200`,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 4. Validate created admin has correct email and full_name
  TestValidator.equals(
    "created admin email should match input",
    createdAdmin.email,
    newAdminEmail,
  );
  TestValidator.predicate(
    "created admin email_verified is true",
    createdAdmin.email_verified === true,
  );
  // Optional fields can be null or string, so validate accordingly
  if (
    createdAdmin.phone_number !== null &&
    createdAdmin.phone_number !== undefined
  ) {
    TestValidator.predicate(
      "created admin phone_number is a non-empty string",
      typeof createdAdmin.phone_number === "string" &&
        createdAdmin.phone_number.length > 0,
    );
  }
  if (
    createdAdmin.profile_picture_url !== null &&
    createdAdmin.profile_picture_url !== undefined
  ) {
    TestValidator.predicate(
      "created admin profile_picture_url is a non-empty string",
      typeof createdAdmin.profile_picture_url === "string" &&
        createdAdmin.profile_picture_url.length > 0,
    );
  }
  TestValidator.predicate(
    "created admin full_name is non-empty string",
    typeof createdAdmin.full_name === "string" &&
      createdAdmin.full_name.length > 0,
  );
  // Timestamps should be valid date-time strings
  typia.assert(createdAdmin.created_at);
  typia.assert(createdAdmin.updated_at);
}
