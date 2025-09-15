import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationOrganizerRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequest";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test regular user successfully submitting an event organizer request.
 *
 * Steps:
 *
 * 1. Create a new regular user with realistic data.
 * 2. Submit an organizer request using the created user's ID.
 * 3. Validate the response respects schema and business rules.
 */
export async function test_api_regular_user_create_organizer_request_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const createdUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // 2. Submit an organizer request with status 'pending'
  const organizerRequestBody = {
    user_id: createdUser.id,
    status: "pending",
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    admin_comment: null,
  } satisfies IEventRegistrationOrganizerRequest.ICreate;

  const createdOrganizerRequest: IEventRegistrationOrganizerRequest =
    await api.functional.eventRegistration.regularUser.organizerRequests.createOrganizerRequest(
      connection,
      {
        body: organizerRequestBody,
      },
    );
  typia.assert(createdOrganizerRequest);

  // 3. Validate response business logic
  TestValidator.equals(
    "organizer request user_id matches created user",
    createdOrganizerRequest.user_id,
    createdUser.id,
  );
  TestValidator.equals(
    "organizer request status is 'pending'",
    createdOrganizerRequest.status,
    "pending",
  );
  TestValidator.equals(
    "organizer request reason matches request",
    createdOrganizerRequest.reason,
    organizerRequestBody.reason,
  );
}
