import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Validate retrieving a single event organizer's details as an admin user.
 *
 * This test creates an admin user and logs in to establish the admin
 * authentication context. Then, it creates an event organizer user with all
 * required information. Finally, it retrieves the created event organizer
 * by its ID through the admin endpoint and validates key fields for
 * correctness.
 *
 * This confirms the success path for the admin API to retrieve a single
 * event organizer.
 */
export async function test_api_event_organizers_retrieve_single_admin_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user to establish an admin context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPasswordHash123!";
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login as the admin user to authenticate
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new event organizer
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = "PasswordHashForOrganizer!2024";
  const organizerCreate: IEventRegistrationEventOrganizer.ICreate = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  };
  const organizer: IEventRegistrationEventOrganizer =
    await api.functional.eventRegistration.admin.eventOrganizers.create(
      connection,
      {
        body: organizerCreate,
      },
    );
  typia.assert(organizer);

  // 4. Retrieve the event organizer details by ID
  const retrievedOrganizer: IEventRegistrationEventOrganizer =
    await api.functional.eventRegistration.admin.eventOrganizers.at(
      connection,
      {
        eventOrganizerId: organizer.id,
      },
    );
  typia.assert(retrievedOrganizer);

  // 5. Validate key fields match
  TestValidator.equals(
    "Organizer email matches",
    retrievedOrganizer.email,
    organizerCreate.email,
  );
  TestValidator.equals(
    "Organizer full name matches",
    retrievedOrganizer.full_name,
    organizerCreate.full_name,
  );
  TestValidator.equals(
    "Organizer email verified flag matches",
    retrievedOrganizer.email_verified,
    organizerCreate.email_verified,
  );
}
