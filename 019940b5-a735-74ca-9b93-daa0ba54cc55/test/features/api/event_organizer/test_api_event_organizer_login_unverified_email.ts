import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

export async function test_api_event_organizer_login_unverified_email(
  connection: api.IConnection,
) {
  // Step 1: Create a new event organizer with email_verified set to false
  const email = `unverified_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name();
  const createBody = {
    email,
    password_hash: passwordHash,
    full_name: fullName,
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: createBody,
    });
  typia.assert(organizer);

  // Assert the email_verified is false
  TestValidator.equals(
    "event organizer email_verified is false",
    organizer.email_verified,
    false,
  );

  // Step 2: Attempt to login with correct credentials (should fail)
  const loginBody = {
    email,
    password_hash: passwordHash,
  } satisfies IEventRegistrationEventOrganizer.ILogin;

  // Expect error on login due to unverified email
  await TestValidator.error("login fails for unverified email", async () => {
    await api.functional.auth.eventOrganizer.login(connection, {
      body: loginBody,
    });
  });
}
