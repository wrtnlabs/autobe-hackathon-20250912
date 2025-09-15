import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

export async function test_api_event_organizers_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: `https://${RandomGenerator.alphaNumeric(8)}.com/pic.jpg`,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: admin.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create event organizer
  const createOrganizerBody = {
    email: `organizer.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: `https://${RandomGenerator.alphaNumeric(8)}.com/organizer.png`,
    email_verified: false,
  } satisfies IEventRegistrationEventOrganizer.ICreate;
  const organizer: IEventRegistrationEventOrganizer =
    await api.functional.eventRegistration.admin.eventOrganizers.create(
      connection,
      { body: createOrganizerBody },
    );
  typia.assert(organizer);

  // 4. Update event organizer profile
  const updateBody = {
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.IUpdate;

  const updatedOrganizer: IEventRegistrationEventOrganizer =
    await api.functional.eventRegistration.admin.eventOrganizers.update(
      connection,
      {
        eventOrganizerId: organizer.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrganizer);

  // 5. Validate updated fields
  TestValidator.equals(
    "updated full_name matches",
    updatedOrganizer.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "updated phone_number is null",
    updatedOrganizer.phone_number,
    null,
  );
  TestValidator.equals(
    "updated profile_picture_url is null",
    updatedOrganizer.profile_picture_url,
    null,
  );
  TestValidator.equals(
    "updated email_verified matches",
    updatedOrganizer.email_verified,
    updateBody.email_verified,
  );

  // Validate unchanged fields
  TestValidator.equals(
    "email unchanged",
    updatedOrganizer.email,
    organizer.email,
  );
  TestValidator.equals(
    "password_hash unchanged",
    updatedOrganizer.password_hash,
    organizer.password_hash,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedOrganizer.created_at === organizer.created_at,
  );
}
