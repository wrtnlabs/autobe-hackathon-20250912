import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import type { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetScript";

export async function test_api_widget_script_list_by_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor user joins to create an account
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "securePass123";

  const joinedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(joinedEditor);

  // 2. Editor logs in to obtain authorization tokens
  const loggedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(loggedEditor);

  // 3. Create a UI page
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: {
        name: RandomGenerator.name(),
        description: null,
        status: "draft",
        flex_office_page_theme_id: null,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(page);

  // 4. Add a widget to the page
  const widgetName = RandomGenerator.name();
  const widgetType = RandomGenerator.pick([
    "table",
    "chart",
    "filter",
    "button",
    "form",
  ] as const);
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.create(connection, {
      pageId: page.id,
      body: {
        flex_office_page_id: page.id,
        widget_type: widgetType,
        name: widgetName,
        configuration: JSON.stringify({ control: true }),
      } satisfies IFlexOfficeWidget.ICreate,
    });
  typia.assert(widget);

  // 5. Create several scripts for the widget with different script_type and content
  const scriptTypes = ["javascript", "python", "typescript"] as const;
  const scripts: IFlexOfficeWidgetScript[] = [];
  for (let i = 0; i < 5; i++) {
    const scriptType = RandomGenerator.pick(scriptTypes);
    const scriptContent = `console.log('Script number ${i + 1}');`;
    const script: IFlexOfficeWidgetScript =
      await api.functional.flexOffice.editor.widgets.scripts.create(
        connection,
        {
          widgetId: widget.id,
          body: {
            flex_office_widget_id: widget.id,
            script_type: scriptType,
            script_content: scriptContent,
          } satisfies IFlexOfficeWidgetScript.ICreate,
        },
      );
    typia.assert(script);
    scripts.push(script);
  }

  // 6. Retrieve scripts list for the widget with default pagination
  const retrievedScriptsPage: IPageIFlexOfficeWidgetScript.ISummary =
    await api.functional.flexOffice.editor.widgets.scripts.index(connection, {
      widgetId: widget.id,
      body: {
        page: 1,
        limit: 10,
        sortBy: "created_at",
        order: "desc",
        filter: null,
      } satisfies IFlexOfficeWidgetScript.IRequest,
    });
  typia.assert(retrievedScriptsPage);

  // Check pagination validity
  TestValidator.predicate(
    "pagination current page is 1",
    retrievedScriptsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    retrievedScriptsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof retrievedScriptsPage.pagination.records === "number" &&
      retrievedScriptsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof retrievedScriptsPage.pagination.pages === "number" &&
      retrievedScriptsPage.pagination.pages >= 0,
  );

  // Validate that the number of returned scripts does not exceed the limit
  TestValidator.predicate(
    "number of scripts returned is at most limit",
    retrievedScriptsPage.data.length <= 10,
  );

  // Validate that each returned script summary is valid and present in created scripts
  const createdScriptsIds = scripts.map((s) => s.id);
  for (const scriptSummary of retrievedScriptsPage.data) {
    typia.assertGuard(scriptSummary);
    TestValidator.predicate(
      "script summary has valid id",
      typeof scriptSummary.id === "string" && scriptSummary.id.length > 0,
    );
    TestValidator.predicate(
      "script summary has valid script_type",
      typeof scriptSummary.script_type === "string" &&
        scriptSummary.script_type.length > 0,
    );
    TestValidator.predicate(
      "script summary id is in created scripts",
      createdScriptsIds.includes(scriptSummary.id),
    );
  }

  // 7. Test filtering by a script_type
  const filterScriptType = scripts[0].script_type;
  const filteredScriptsPage: IPageIFlexOfficeWidgetScript.ISummary =
    await api.functional.flexOffice.editor.widgets.scripts.index(connection, {
      widgetId: widget.id,
      body: {
        page: 1,
        limit: 10,
        sortBy: "created_at",
        order: "asc",
        filter: `script_type=${filterScriptType}`,
      } satisfies IFlexOfficeWidgetScript.IRequest,
    });
  typia.assert(filteredScriptsPage);

  for (const scriptSummary of filteredScriptsPage.data) {
    typia.assertGuard(scriptSummary);
    TestValidator.equals(
      "filtered script_type matches query",
      scriptSummary.script_type,
      filterScriptType,
    );
  }

  // 8. Test error handling by passing invalid pagination (page=0)
  await TestValidator.error("should throw error when page is 0", async () => {
    await api.functional.flexOffice.editor.widgets.scripts.index(connection, {
      widgetId: widget.id,
      body: {
        page: 0,
        limit: 10,
        sortBy: null,
        order: null,
        filter: null,
      } satisfies IFlexOfficeWidgetScript.IRequest,
    });
  });

  // 9. Test unauthorized access by using a new connection without login
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "access denied without authentication",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.index(
        unauthenticatedConnection,
        {
          widgetId: widget.id,
          body: {
            page: 1,
            limit: 10,
            sortBy: "created_at",
            order: "desc",
            filter: null,
          } satisfies IFlexOfficeWidgetScript.IRequest,
        },
      );
    },
  );
}
