import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Test deleting an existing event organizer securely.
 *
 * This test performs the full workflow of admin account creation and login,
 * followed by creation of an event organizer account. It then deletes the event
 * organizer using admin privileges, verifying successful deletion. An attempt
 * to delete the already deleted organizer is tested to ensure error handling is
 * correct.
 */
export async function test_api_event_organizer_delete_success(
  connection: api.IConnection,
) {
  // Create an admin user account
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(6) + "@admin.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(admin);

  // Admin login to establish authentication
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoggedIn = await api.functional.auth.admin.login.loginAdminUser(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoggedIn);

  // Create an event organizer user to be deleted
  const organizerCreateBody = {
    email: RandomGenerator.alphaNumeric(6) + "@organizer.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer = await api.functional.auth.eventOrganizer.join(connection, {
    body: organizerCreateBody,
  });
  typia.assert(organizer);

  // Delete the created event organizer as admin
  await api.functional.eventRegistration.admin.eventOrganizers.erase(
    connection,
    {
      eventOrganizerId: organizer.id,
    },
  );

  // Attempt to delete the same event organizer again, expect failure
  await TestValidator.error(
    "delete non-existent event organizer should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventOrganizers.erase(
        connection,
        {
          eventOrganizerId: organizer.id,
        },
      );
    },
  );
}
