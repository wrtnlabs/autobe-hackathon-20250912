import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageVersion";

/**
 * E2E test for admin search of UI page versions with authentication.
 *
 * Ensures admins can register, log in, create pages, and correctly retrieve
 * version summaries with pagination and filtering. Also validates error
 * handling for invalid params.
 */
export async function test_api_admin_page_versions_search_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "securePassword123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login for token refresh
  const loginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create a UI page
  const pageCreateBody = {
    name: `Page ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 7 })}`,
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;

  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(createdPage);

  // 4. Search page versions for the created page
  //    Use valid filters in the body
  const searchBody: IFlexOfficePageVersion.IRequest = {
    pageId: createdPage.id,
    pageIds: null,
    version_number: null,
    version_numbers: null,
    page_data: null,
    created_at_gte: null,
    created_at_lte: null,
    page_data_contains: null,
    sortBy: "created_at",
    page: 1,
    limit: 10,
  };

  const versionsPage: IPageIFlexOfficePageVersion.ISummary =
    await api.functional.flexOffice.admin.pages.versions.searchPageVersions(
      connection,
      {
        pageId: createdPage.id,
        body: searchBody,
      },
    );
  typia.assert(versionsPage);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page number is positive",
    versionsPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    versionsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    versionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is positive or zero",
    versionsPage.pagination.pages >= 0,
  );

  // Validate each version summary
  for (const version of versionsPage.data) {
    typia.assert(version);
    TestValidator.predicate(
      "version id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        version.id,
      ),
    );
    TestValidator.predicate(
      "version_number is integer >= 0",
      Number.isInteger(version.version_number) && version.version_number >= 0,
    );

    // Validate created_at is ISO 8601 date-time string
    // typia.assert() covers this, so no extra validation needed
  }

  // 5. Test error for invalid pageId
  await TestValidator.error(
    "search page versions with invalid pageId should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.versions.searchPageVersions(
        connection,
        {
          pageId: "invalid-uuid-format-string",
          body: searchBody,
        },
      );
    },
  );

  // Note: Testing unauthorized access requires other roles and token switching
  // which is not possible with only the given API functions; thus skipped.
}
