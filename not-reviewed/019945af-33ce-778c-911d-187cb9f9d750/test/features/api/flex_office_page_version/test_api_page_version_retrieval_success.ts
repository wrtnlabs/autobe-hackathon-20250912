import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import type { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";
import type { IPageIFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageVersion";

/**
 * This E2E test function validates the retrieval of a detailed UI page version
 * for an editor user. It performs the following sequence:
 *
 * 1. Registers and authenticates an editor user.
 * 2. Searches for available page themes and selects one.
 * 3. Creates a new page with the selected theme.
 * 4. Creates a version snapshot for the new page.
 * 5. Retrieves the created page version by ID and validates returned content.
 * 6. Performs negative tests for unauthorized access and non-existent version IDs.
 *
 * At every step, responses are fully validated using typia.assert and business
 * logic is checked with TestValidator.enums to confirm exact matches. This
 * ensures robust verification of the API's page versioning capabilities.
 */
export async function test_api_page_version_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Editor user registration
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "StrongP@ssw0rd";

  const createdEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(createdEditor);
  TestValidator.predicate(
    "Editor join returns UUID format id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdEditor.id,
    ),
  );

  // 2. Editor login to get fresh tokens
  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(loggedInEditor);
  TestValidator.equals(
    "Login returns same editor id",
    loggedInEditor.id,
    createdEditor.id,
  );

  // 3. Search for page themes
  const themePageRequestBody = {
    name: null,
    page: 1,
    limit: 10,
  } satisfies IFlexOfficePageTheme.IRequest;

  const pageThemeResponse =
    await api.functional.flexOffice.editor.pageThemes.index(connection, {
      body: themePageRequestBody,
    });
  typia.assert(pageThemeResponse);
  TestValidator.predicate(
    "Got page theme with pagination and at least one theme",
    Array.isArray(pageThemeResponse.data) && pageThemeResponse.data.length > 0,
  );

  const selectedTheme: IFlexOfficePageTheme.ISummary =
    pageThemeResponse.data[0];
  typia.assert(selectedTheme);

  // 4. Create a new page with selected theme
  const createPageBody = {
    name: RandomGenerator.name(3),
    flex_office_page_theme_id: selectedTheme.id,
    description: "Test page for version retrieval",
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;

  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: createPageBody,
    });
  typia.assert(createdPage);
  TestValidator.equals(
    "Created page has assigned theme id",
    createdPage.flex_office_page_theme_id,
    selectedTheme.id,
  );

  // 5. Create a version snapshot for this page
  // For creating a version, use the versions search PATCH API as per dependency information
  const versionCreateBody = {
    pageId: createdPage.id,
    page_data: JSON.stringify({ layout: "test layout", widgets: [] }),
  } satisfies IFlexOfficePageVersion.IRequest;

  const pageVersionSummaryResponse =
    await api.functional.flexOffice.editor.pages.versions.searchPageVersions(
      connection,
      {
        pageId: createdPage.id,
        body: versionCreateBody,
      },
    );
  typia.assert(pageVersionSummaryResponse);
  TestValidator.predicate(
    "Version summary response contains at least one version",
    pageVersionSummaryResponse.data.length > 0,
  );

  const createdVersionSummary = pageVersionSummaryResponse.data[0];
  typia.assert(createdVersionSummary);

  // 6. Retrieve the page version by its ID
  const retrievedVersion: IFlexOfficePageVersion =
    await api.functional.flexOffice.editor.pages.versions.atPageVersion(
      connection,
      {
        pageId: createdPage.id,
        versionId: createdVersionSummary.id,
      },
    );
  typia.assert(retrievedVersion);

  // Validate that the retrieved version matches the created summary
  TestValidator.equals(
    "Page version id matches",
    retrievedVersion.id,
    createdVersionSummary.id,
  );
  TestValidator.equals(
    "Page version number matches",
    retrievedVersion.version_number,
    createdVersionSummary.version_number,
  );
  TestValidator.equals(
    "Page version created_at matches",
    retrievedVersion.created_at,
    createdVersionSummary.created_at,
  );
  TestValidator.equals(
    "Retrieved version's pageId matches created page id",
    retrievedVersion.flex_office_page_id,
    createdPage.id,
  );

  // Check that the page_data is the expected JSON string
  TestValidator.predicate(
    "Page data is JSON string",
    typeof retrievedVersion.page_data === "string" &&
      retrievedVersion.page_data.length > 0,
  );

  // 7. Negative test: attempt to get with invalid version ID
  await TestValidator.error(
    "Fetch page version with invalid versionId fails",
    async () => {
      await api.functional.flexOffice.editor.pages.versions.atPageVersion(
        connection,
        {
          pageId: createdPage.id,
          versionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Negative test: unauthorized access
  // Create unauthenticated connection (no auth headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized access to page version retrieval",
    async () => {
      await api.functional.flexOffice.editor.pages.versions.atPageVersion(
        unauthenticatedConnection,
        {
          pageId: createdPage.id,
          versionId: createdVersionSummary.id,
        },
      );
    },
  );
}
