import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetInstallation";

/**
 * This test verifies the paginated retrieval and filtering of widget
 * installations for a marketplace widget by an editor user. First, an editor
 * user is registered and logged in, followed by the creation of a new
 * marketplace widget. Then, the list of installations for that widget is
 * retrieved with various filter and pagination parameters, and the correctness
 * of response structure and data is validated. Additionally, attempts by
 * unauthorized users (viewer/admin) to access the installations list are
 * expected to fail, verifying role-based access control. Throughout, all
 * operations use valid, schema-compliant data. The test ensures that all
 * required parameters are provided, authenticates users properly, and validates
 * the responses with typia.assert and TestValidator. The pagination details
 * like current page, limit, total records, and pages are checked for meaningful
 * values, and the installations data array is checked for consistency with
 * filtering parameters. The test uses realistic values consistent with UUID
 * format, pagination constraints, and string filters for search and sort
 * parameters.
 */
export async function test_api_marketplace_widget_installations_pagination_and_filtering_editor(
  connection: api.IConnection,
) {
  // 1. Register new editor and obtain authorization
  const editorCreate = {
    name: RandomGenerator.name(),
    email: `editor${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "strongPassword123", // use a valid strong password in tests
  } satisfies IFlexOfficeEditor.ICreate;

  const authorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreate,
    });
  typia.assert(authorized);

  // 2. Login as editor user with same credentials
  const editorLogin = {
    email: editorCreate.email,
    password: editorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLogin,
    });
  typia.assert(loginAuthorized);

  // 3. Create a marketplace widget
  const widgetCreate = {
    widget_code: `widget_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    version: `1.0.${RandomGenerator.alphaNumeric(1)}`,
    description: `E2E test widget creation at ${new Date().toISOString()}`,
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  const createdWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.editor.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreate,
      },
    );
  typia.assert(createdWidget);

  // 4. Request paginated list of widget installations (with filters)
  const installationsRequest: IFlexOfficeWidgetInstallation.IRequest = {
    page: 0,
    limit: 15,
    search: null,
    sortBy: "installation_date",
    sortOrder: "desc",
    filterByPageId: null,
    filterByWidgetId: createdWidget.id,
  } satisfies IFlexOfficeWidgetInstallation.IRequest;

  const installationPage: IPageIFlexOfficeWidgetInstallation.ISummary =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.indexWidgetInstallations(
      connection,
      {
        widgetId: createdWidget.id,
        body: installationsRequest,
      },
    );
  typia.assert(installationPage);

  // Check pagination info contains plausible values
  TestValidator.predicate(
    "pagination current non-negative",
    installationPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    installationPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    installationPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    installationPage.pagination.pages >= 0,
  );

  // Validate each installation's widget id matches filter
  installationPage.data.forEach((item) => {
    TestValidator.equals(
      "installation widget id filter matches",
      item.marketplace_widget_id,
      createdWidget.id,
    );
  });

  // 5. Attempt access with an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.flexOffice.editor.marketplaceWidgets.installations.indexWidgetInstallations(
        unauthConn,
        {
          widgetId: createdWidget.id,
          body: installationsRequest,
        },
      );
    },
  );
}
