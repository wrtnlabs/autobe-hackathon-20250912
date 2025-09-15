import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Test for successful event organizer registration (join).
 *
 * This E2E test validates that a new event organizer user can be
 * successfully registered using the join API endpoint. It ensures the API
 * correctly processes the payload, creates the user, and returns authorized
 * user data including JWT tokens.
 *
 * The test covers:
 *
 * 1. Preparing a valid creation DTO with required and optional fields.
 * 2. Invoking the join endpoint with the DTO.
 * 3. Validating the response structure, data integrity, and tokens.
 *
 * The test uses typia.assert to verify response types and TestValidator to
 * assert key business constraints.
 */
export async function test_api_event_organizer_join_success(
  connection: api.IConnection,
) {
  // Prepare a valid create DTO
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password
  const fullName = RandomGenerator.name();
  // Optional fields are explicitly provided as null here to adhere to nullability
  const phoneNumber = null;
  const profilePictureURL = null;
  const emailVerified = false;

  const body = {
    email,
    password_hash: passwordHash,
    full_name: fullName,
    phone_number: phoneNumber,
    profile_picture_url: profilePictureURL,
    email_verified: emailVerified,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  // Call join API
  const authorized = await api.functional.auth.eventOrganizer.join(connection, {
    body,
  });
  typia.assert(authorized);

  // Verify critical properties
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "email_verified is false",
    authorized.email_verified,
    false,
  );
  TestValidator.predicate(
    "access token is a string",
    typeof authorized.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is a string",
    typeof authorized.token.refresh === "string",
  );
}
