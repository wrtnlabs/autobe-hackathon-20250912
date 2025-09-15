import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventCategory";

/**
 * Test the retrieval of the event categories list with filtering, pagination,
 * and sorting as an admin user. Validate that the admin can successfully query
 * event categories, filter by name, and receive paginated results fulfilling
 * business needs for managing event classifications.
 */
export async function test_api_event_category_index_admin(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(32);
  const full_name = RandomGenerator.name();
  const adminCreateBody = {
    email,
    password_hash,
    full_name,
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const createdAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  // 2. Login as admin user
  const adminLoginBody = {
    email,
    password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // The SDK automatically updates the Authorization header on connection

  // 3. Call event categories query as admin
  const filterRequest: IEventRegistrationEventCategory.IRequest = {
    name: RandomGenerator.name(1).slice(0, 5), // partial name filter
    description: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    page: 1,
    limit: 10,
    sortBy: "name",
    sortDirection: "asc",
  };

  const eventCategoriesPage: IPageIEventRegistrationEventCategory.ISummary =
    await api.functional.eventRegistration.admin.eventCategories.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(eventCategoriesPage);

  // 4. Test pagination properties
  TestValidator.predicate(
    "pagination current page is 1",
    eventCategoriesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    eventCategoriesPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    eventCategoriesPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    eventCategoriesPage.pagination.pages >= 0,
  );

  // 5. Test each event category summary item
  for (const category of eventCategoriesPage.data) {
    typia.assert(category);
    TestValidator.predicate(
      "category id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
    TestValidator.predicate(
      "category name is a non-empty string",
      typeof category.name === "string" && category.name.length > 0,
    );

    if (category.description !== null && category.description !== undefined) {
      TestValidator.predicate(
        "category description is string",
        typeof category.description === "string",
      );
    }

    TestValidator.predicate(
      "category created_at is ISO string",
      typeof category.created_at === "string" && category.created_at.length > 0,
    );
    TestValidator.predicate(
      "category updated_at is ISO string",
      typeof category.updated_at === "string" && category.updated_at.length > 0,
    );
  }
}
