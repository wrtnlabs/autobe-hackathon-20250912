import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

/**
 * Test updating an existing event category's name and description as an admin
 * user.
 *
 * Validates that admin users can update event categories by modifying the name
 * and description. The test includes admin user creation and login to obtain
 * authenticated context. It then updates an event category by a valid UUID ID
 * and asserts the response correctly reflects the updates with valid
 * timestamps.
 */
export async function test_api_event_category_update_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user creation
  const adminCreatePayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreatePayload,
    });
  typia.assert(adminUser);

  // Step 2: Admin user login
  const adminLoginPayload = {
    email: adminCreatePayload.email,
    password_hash: adminCreatePayload.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginPayload,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Prepare event category update data
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    deleted_at: null,
  } satisfies IEventRegistrationEventCategory.IUpdate;

  // Step 4: Use a random UUID for eventCategoryId (supposed existing)
  const eventCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Call update API
  const updatedCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.update(
      connection,
      {
        eventCategoryId: eventCategoryId,
        body: updateData,
      },
    );
  typia.assert(updatedCategory);

  // Step 6: Validate response fields
  TestValidator.equals(
    "updated category id should match input id",
    updatedCategory.id,
    eventCategoryId,
  );
  TestValidator.equals(
    "updated category name should match input",
    updatedCategory.name,
    updateData.name,
  );
  TestValidator.equals(
    "updated category description should match input",
    updatedCategory.description,
    updateData.description,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      updatedCategory.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      updatedCategory.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at should be null as not deleted",
    updatedCategory.deleted_at,
    null,
  );
}
