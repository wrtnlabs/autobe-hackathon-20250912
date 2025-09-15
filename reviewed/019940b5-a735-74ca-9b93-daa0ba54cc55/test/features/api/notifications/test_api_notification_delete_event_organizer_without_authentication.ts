import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Verifies that deleting an event organizer notification without
 * authentication fails with an appropriate error.
 *
 * This test ensures that the API strictly enforces authentication
 * requirements by rejecting deletion requests from unauthenticated clients,
 * even if a valid notification ID is provided.
 *
 * The test performs the following steps:
 *
 * 1. Invokes the event organizer join endpoint to establish a user profile.
 * 2. Attempts to delete a notification using a random UUID without setting
 *    authentication headers.
 * 3. Expects and validates that the operation throws an unauthorized access
 *    error.
 *
 * This validates the security of the notification deletion endpoint against
 * unauthorized usage.
 */
export async function test_api_notification_delete_event_organizer_without_authentication(
  connection: api.IConnection,
) {
  // 1. Perform join to create event organizer user to satisfy prerequisite
  const organizer = await api.functional.auth.eventOrganizer.join(connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password_hash: RandomGenerator.alphaNumeric(16),
      full_name: RandomGenerator.name(),
      phone_number: null,
      profile_picture_url: null,
      email_verified: false,
    } satisfies IEventRegistrationEventOrganizer.ICreate,
  });
  typia.assert(organizer);

  // 2. Prepare an unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to delete notification without authentication, expect error
  await TestValidator.error(
    "deleting notification without authentication should fail",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.notifications.erase(
        unauthenticatedConnection,
        {
          notificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
