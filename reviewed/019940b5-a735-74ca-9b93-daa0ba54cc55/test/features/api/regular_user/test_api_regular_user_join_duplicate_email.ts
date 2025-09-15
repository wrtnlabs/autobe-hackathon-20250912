import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_regular_user_join_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create a new regular user with a randomly generated email and valid data
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // simulate a hashed password
  const fullName: string = RandomGenerator.name();

  // Prepare user creation request body
  const createUserBody = {
    email: email,
    password_hash: passwordHash,
    full_name: fullName,
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  // Perform the initial join (registration) call - should succeed
  const firstUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: createUserBody,
    });
  typia.assert(firstUser);
  TestValidator.equals("initial user email", firstUser.email, email);

  // Step 2: Attempt to create another user with the SAME email
  const duplicateUserBody = {
    ...createUserBody,
  } satisfies IEventRegistrationRegularUser.ICreate;

  // Expect an error due to duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.regularUser.join.joinRegularUser(connection, {
        body: duplicateUserBody,
      });
    },
  );
}
