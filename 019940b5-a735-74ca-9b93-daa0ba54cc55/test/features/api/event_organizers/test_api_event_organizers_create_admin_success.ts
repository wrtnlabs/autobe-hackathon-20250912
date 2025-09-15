import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Validate successful creation of an event organizer by an authenticated
 * admin user.
 *
 * This E2E test performs the following steps:
 *
 * 1. Creates an admin user with required authentication credentials and
 *    profile details.
 * 2. Logs in as the created admin to establish authentication context.
 * 3. Uses the authenticated admin to create a new event organizer user,
 *    providing all required fields and optional fields with valid realistic
 *    data.
 * 4. Validates that the created event organizer's response includes all
 *    required properties with correct formats, including UUID for id,
 *    correct email, full name, phone number, profile picture URL, email
 *    verified flag, and timestamps.
 * 5. Uses typia.assert to ensure strict type conformity of all API responses.
 * 6. Ensures all API calls await correctly and error scenarios are not part of
 *    this positive path test.
 */
export async function test_api_event_organizers_create_admin_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminFullName = RandomGenerator.name();

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: adminFullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const login: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(login);

  // 3. Create event organizer user by admin
  const organizerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const organizerPasswordHash = RandomGenerator.alphaNumeric(32);
  const organizerFullName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const profilePicUrl = `https://picsum.photos/id/${typia.random<number & tags.Type<"uint32">>()}/200/300`;

  const organizer: IEventRegistrationEventOrganizer =
    await api.functional.eventRegistration.admin.eventOrganizers.create(
      connection,
      {
        body: {
          email: organizerEmail,
          password_hash: organizerPasswordHash,
          full_name: organizerFullName,
          phone_number: phoneNumber,
          profile_picture_url: profilePicUrl,
          email_verified: true,
        } satisfies IEventRegistrationEventOrganizer.ICreate,
      },
    );
  typia.assert(organizer);

  // Validate important properties
  TestValidator.predicate(
    "created organizer has id with UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      organizer.id,
    ),
  );
  TestValidator.equals(
    "organizer email matches input",
    organizer.email,
    organizerEmail,
  );
  TestValidator.equals(
    "organizer full name matches input",
    organizer.full_name,
    organizerFullName,
  );
  TestValidator.equals(
    "organizer email_verified flag is true",
    organizer.email_verified,
    true,
  );
}
