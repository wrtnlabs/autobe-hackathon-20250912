import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Tests enforcement of unique email constraint during event organizer
 * registration.
 *
 * This test function attempts to register an event organizer successfully,
 * then attempts to register another with the same email, expecting the
 * backend to reject the duplicate. It validates that the join endpoint
 * properly enforces email uniqueness, ensuring system data integrity.
 *
 * Test flow:
 *
 * 1. Generate realistic event organizer data with a unique email.
 * 2. Call the join endpoint to register successfully.
 * 3. Call the join endpoint again with the same email and await an error.
 * 4. Assert that the first registration returns a valid authorized response.
 * 5. Assert that the second registration fails due to duplicate email.
 */
export async function test_api_event_organizer_join_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register a new event organizer with unique email
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64);
  const fullName = RandomGenerator.name();

  const firstOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: email,
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(firstOrganizer);

  // 2. Try to register another event organizer with the same email and assert failure
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: email, // duplicate email
        password_hash: RandomGenerator.alphaNumeric(64),
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  });
}
