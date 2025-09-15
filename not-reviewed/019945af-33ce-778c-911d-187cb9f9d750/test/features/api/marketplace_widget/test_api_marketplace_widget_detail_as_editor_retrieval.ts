import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeMarketplaceWidget";

/**
 * Validate the detail retrieval of marketplace widgets as an authenticated
 * editor user.
 *
 * This test ensures an editor user can register, log in, and retrieve detailed
 * marketplace widget information with proper authorization.
 *
 * Steps:
 *
 * 1. Editor user registration via auth.editor.join
 * 2. Editor user authentication via auth.editor.login
 * 3. Fetch marketplace widget details via
 *    flexOffice.editor.marketplaceWidgets.index
 * 4. Validate widget data list and the correctness of widget properties
 */
export async function test_api_marketplace_widget_detail_as_editor_retrieval(
  connection: api.IConnection,
) {
  // 1. Register editor user
  const editorCreate = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1)
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()}@example.com`,
    password: "P@ssw0rd123",
  } satisfies IFlexOfficeEditor.ICreate;
  const createdEditor = await api.functional.auth.editor.join(connection, {
    body: editorCreate,
  });
  typia.assert(createdEditor);

  // 2. Authenticate editor user
  const editorLogin = {
    email: editorCreate.email,
    password: editorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loggedInEditor = await api.functional.auth.editor.login(connection, {
    body: editorLogin,
  });
  typia.assert(loggedInEditor);

  // 3. Retrieve marketplace widget detail list using editor authorization
  // Prepare a request - using typical pagination and search parameters
  // Setting 'search' to null disables the search filter
  const requestBody = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDir: "desc",
    search: null,
  } satisfies IFlexOfficeMarketplaceWidget.IRequest;

  // Call API
  const widgetPage =
    await api.functional.flexOffice.editor.marketplaceWidgets.index(
      connection,
      { body: requestBody },
    );
  typia.assert(widgetPage);

  // 4. Validate the returned widget data
  TestValidator.predicate("has data list", widgetPage.data.length > 0);

  for (const widget of widgetPage.data) {
    typia.assert(widget);
    TestValidator.predicate(
      "widget id is a UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        widget.id,
      ),
    );
    TestValidator.predicate(
      "widget code is non-empty",
      typeof widget.widget_code === "string" && widget.widget_code.length > 0,
    );
    TestValidator.predicate(
      "widget name is non-empty",
      typeof widget.name === "string" && widget.name.length > 0,
    );
    TestValidator.predicate(
      "widget version is non-empty",
      typeof widget.version === "string" && widget.version.length > 0,
    );
    TestValidator.predicate(
      "widget created_at is ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        widget.created_at,
      ),
    );
  }
}
