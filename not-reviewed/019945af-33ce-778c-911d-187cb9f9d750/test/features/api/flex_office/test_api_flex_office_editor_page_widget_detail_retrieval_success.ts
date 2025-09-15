import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

export async function test_api_flex_office_editor_page_widget_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an editor user via /auth/editor/join
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // 2. Prepare valid pageId and widgetId for retrieval
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const widgetId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve widget details for the given pageId and widgetId
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.at(connection, {
      pageId,
      widgetId,
    });
  typia.assert(widget);

  // 4. Validate retrieved widget data matches requested parameters
  TestValidator.equals(
    "retrieved widget id should match requested widgetId",
    widget.id,
    widgetId,
  );
  TestValidator.equals(
    "retrieved widget flex_office_page_id should match requested pageId",
    widget.flex_office_page_id,
    pageId,
  );
}
