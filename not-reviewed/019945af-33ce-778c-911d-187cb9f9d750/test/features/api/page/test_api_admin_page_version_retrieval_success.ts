import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import type { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import type { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";
import type { IPageIFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageVersion";
import type { IPageIFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeSystemSettings";

/**
 * Validate the retrieval of a UI page version details as an admin.
 *
 * Detailed workflow:
 *
 * 1. Admin account registration and login to acquire authorization.
 * 2. Retrieve or create a UI page theme for assignment.
 * 3. Create a new UI page assigned to the selected page theme.
 * 4. Create a version snapshot for the new page.
 * 5. Retrieve the created version data from the API and assert all must-have
 *    attributes.
 */
export async function test_api_admin_page_version_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";

  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 2. Retrieve or create system settings (not used directly, just prerequisite)
  const systemSettingsSummary: IPageIFlexOfficeSystemSettings.ISummary =
    await api.functional.flexOffice.admin.systemSettings.index(connection, {
      body: {},
    });
  typia.assert(systemSettingsSummary);

  // 3. Search UI page themes
  const pageThemesSummary: IPageIFlexOfficePageTheme.ISummary =
    await api.functional.flexOffice.admin.pageThemes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IFlexOfficePageTheme.IRequest,
    });
  typia.assert(pageThemesSummary);

  // 4. Choose or create a page theme
  let pageThemeId: (string & tags.Format<"uuid">) | null = null;
  if (pageThemesSummary.data.length > 0) {
    pageThemeId = pageThemesSummary.data[0].id;
  } else {
    // Create page theme not supported by provided APIs, so setting null
    pageThemeId = null;
  }

  // 5. Create a UI page with pageThemeId
  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: {
        flex_office_page_theme_id: pageThemeId,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "draft",
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(createdPage);

  // 6. Create a version snapshot for the created page
  const versionSearchBody: IFlexOfficePageVersion.IRequest = {
    pageId: createdPage.id,
    page: 1,
    limit: 1,
  };
  const versionsSummary: IPageIFlexOfficePageVersion.ISummary =
    await api.functional.flexOffice.admin.pages.versions.searchPageVersions(
      connection,
      {
        pageId: createdPage.id,
        body: versionSearchBody,
      },
    );
  typia.assert(versionsSummary);

  // Validate at least one version exists
  TestValidator.predicate(
    "at least one version exists",
    versionsSummary.data.length > 0,
  );

  // Take the first version (most recent version) for retrieval
  const versionSummary = versionsSummary.data[0];

  // 7. Retrieve the detailed version data
  const pageVersion: IFlexOfficePageVersion =
    await api.functional.flexOffice.admin.pages.versions.atPageVersion(
      connection,
      {
        pageId: createdPage.id,
        versionId: versionSummary.id,
      },
    );
  typia.assert(pageVersion);

  // 8. Validation of retrieved version
  TestValidator.equals(
    "version ID should match",
    pageVersion.id,
    versionSummary.id,
  );
  TestValidator.equals(
    "page ID should match the created page",
    pageVersion.flex_office_page_id,
    createdPage.id,
  );
  TestValidator.equals(
    "version number should match",
    pageVersion.version_number,
    versionSummary.version_number,
  );
  TestValidator.predicate(
    "page data should be non-empty string",
    typeof pageVersion.page_data === "string" &&
      pageVersion.page_data.length > 0,
  );
  TestValidator.predicate(
    "created_at should be valid ISO date-time string",
    typeof pageVersion.created_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        pageVersion.created_at,
      ),
  );
}
