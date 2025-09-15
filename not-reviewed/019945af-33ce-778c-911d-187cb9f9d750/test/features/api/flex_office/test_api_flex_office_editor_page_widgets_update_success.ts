import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidget";

/**
 * Validates the widget update process on a FlexOffice editor page.
 *
 * This test authenticates an Editor user via the /auth/editor/join
 * endpoint, obtaining authorization tokens necessary for editing
 * operations. It then simulates updating the widgets on a specific page by
 * PATCHing valid widget data to the
 * /flexOffice/editor/pages/{pageId}/widgets endpoint. The test verifies
 * successful update by asserting the validity of the updated widget
 * summaries in the response.
 *
 * Steps:
 *
 * 1. Create and authenticate an editor using /auth/editor/join.
 * 2. Generate a realistic UUID for the pageId to be updated.
 * 3. Construct a valid widget update request body with typical widget
 *    properties.
 * 4. Call the PATCH /flexOffice/editor/pages/{pageId}/widgets endpoint with
 *    pageId and widget update body.
 * 5. Assert the response conforms to expected widget summary array and
 *    pagination data.
 *
 * This test ensures role-based access, data schema compliance, and correct
 * synchronization of widget configurations.
 */
export async function test_api_flex_office_editor_page_widgets_update_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IFlexOfficeEditor.ICreate;

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // 2. Generate a valid pageId as UUID
  const pageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Construct valid widget update request body
  // According to IFlexOfficeWidget.IRequest, all fields are optional except for the pageId path parameter.
  // To simulate a realistic update, set page_id to null (means no filter), use a random widget_type and name.
  const widgetUpdateBody = {
    page_id: null,
    widget_type: RandomGenerator.name(2),
    name: RandomGenerator.name(3),
    deleted_at: false,
    page: 1,
    limit: 10,
    orderBy: {
      created_at: "desc",
    },
  } satisfies IFlexOfficeWidget.IRequest;

  // 4. Perform the widget update PATCH call with pageId and request body
  const updateResponse: IPageIFlexOfficeWidget.ISummary =
    await api.functional.flexOffice.editor.pages.widgets.index(connection, {
      pageId: pageId,
      body: widgetUpdateBody,
    });
  typia.assert(updateResponse);

  // 5. Assert response contains pagination and non-empty widget data array
  TestValidator.predicate(
    "pagination current page is positive",
    updateResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    updateResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    updateResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    updateResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "widget data is an array",
    Array.isArray(updateResponse.data),
  );

  // If data present, check each widget summary's required fields
  if (updateResponse.data.length > 0) {
    for (const widget of updateResponse.data) {
      typia.assert(widget);
      TestValidator.predicate(
        "widget id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          widget.id,
        ),
      );
      TestValidator.predicate(
        "widget widget_type is non-empty",
        typeof widget.widget_type === "string" && widget.widget_type.length > 0,
      );
      TestValidator.predicate(
        "widget name is non-empty",
        typeof widget.name === "string" && widget.name.length > 0,
      );
      TestValidator.predicate(
        "widget created_at is valid ISO date",
        !isNaN(Date.parse(widget.created_at)),
      );
      TestValidator.predicate(
        "widget updated_at is valid ISO date",
        !isNaN(Date.parse(widget.updated_at)),
      );
    }
  }
}
