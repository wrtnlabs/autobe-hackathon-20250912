import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

/**
 * Validate admin retrieval of event category details by ID.
 *
 * This test performs a complete verification of the admin authentication
 * and authorization flow to retrieve detailed event category information.
 * It ensures the admin user can successfully create an account, login, and
 * fetch event category data with full property validation.
 *
 * Steps:
 *
 * 1. Create an admin user with realistic data, including email, password hash,
 *    and profile information.
 * 2. Login with the created admin user credentials to authenticate and obtain
 *    an authorization token.
 * 3. Retrieve event category details using a valid UUID eventCategoryId.
 * 4. Validate the event category response for required properties and correct
 *    formats, including nullable description and deleted_at.
 *
 * This ensures the API endpoint for event category retrieval functions
 * correctly within an authenticated admin context.
 */
export async function test_api_event_category_at_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // simulate hash
  const fullName: string = RandomGenerator.name();
  const phoneNumber: string | null = null; // optional, set null explicitly
  const profilePictureUrl: string | null = null; // optional, set null explicitly
  const emailVerified = true; // Required flag as per DTO

  const createdAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: phoneNumber,
        profile_picture_url: profilePictureUrl,
        email_verified: emailVerified,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Login admin user
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Retrieve event category details
  const eventCategoryId = typia.random<string & tags.Format<"uuid">>();
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.at(
      connection,
      {
        eventCategoryId,
      },
    );
  typia.assert(eventCategory);

  // Validate event category fields
  TestValidator.predicate(
    "event category id is UUID format",
    typeof eventCategory.id === "string" && eventCategory.id.length === 36,
  );
  TestValidator.predicate(
    "event category name is non-empty string",
    typeof eventCategory.name === "string" && eventCategory.name.length > 0,
  );
  // description can be string or null
  TestValidator.predicate(
    "event category description can be string or null",
    eventCategory.description === null ||
      typeof eventCategory.description === "string",
  );
  TestValidator.predicate(
    "event category created_at is a string datetime",
    typeof eventCategory.created_at === "string" &&
      eventCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "event category updated_at is a string datetime",
    typeof eventCategory.updated_at === "string" &&
      eventCategory.updated_at.length > 0,
  );
  // deleted_at can be undefined, null or string
  TestValidator.predicate(
    "event category deleted_at is null, undefined, or string",
    eventCategory.deleted_at === null ||
      eventCategory.deleted_at === undefined ||
      typeof eventCategory.deleted_at === "string",
  );
}
