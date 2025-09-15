import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

/**
 * Test marketplace widget creation by an authorized Editor user.
 *
 * This test covers the full registration and authentication flow for an
 * Editor user, then creates a marketplace widget with valid data ensuring
 * successful creation, proper authentication handling, and valid response
 * assertions.
 *
 * Steps:
 *
 * 1. Register a new Editor user
 * 2. Login with the Editor user credentials
 * 3. Create a marketplace widget with unique widget code
 * 4. Verify the response integrity and data correctness
 */
export async function test_api_marketplace_widget_creation_by_editor(
  connection: api.IConnection,
) {
  // 1. Register a new Editor user with random but valid data
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "password123";

  const joinBody = {
    name: editorName,
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized = await api.functional.auth.editor.join(connection, {
    body: joinBody,
  });
  typia.assert(editorAuthorized);

  // 2. Login with the created Editor user credentials
  const loginBody = {
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResult = await api.functional.auth.editor.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Create a unique marketplace widget
  const uniqueWidgetCode = `widget-${RandomGenerator.alphaNumeric(8)}`;
  const widgetCreateBody = {
    widget_code: uniqueWidgetCode,
    name: `Widget ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 })}`,
    version: "1.0.0",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  const createdWidget =
    await api.functional.flexOffice.editor.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreateBody,
      },
    );
  typia.assert(createdWidget);

  // 4. Validate returned data properties
  TestValidator.equals(
    "widget code matches",
    createdWidget.widget_code,
    uniqueWidgetCode,
  );
  TestValidator.predicate(
    "widget id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdWidget.id,
    ),
  );
  TestValidator.predicate(
    "created_at is date-time string",
    !isNaN(Date.parse(createdWidget.created_at)),
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    !isNaN(Date.parse(createdWidget.updated_at)),
  );
  TestValidator.predicate(
    "version format follows semantic versioning",
    /^\d+\.\d+\.\d+$/.test(createdWidget.version),
  );

  // Description may be null or string (optional)
  if (
    createdWidget.description === null ||
    createdWidget.description === undefined
  ) {
    TestValidator.predicate("description can be null or undefined", true);
  } else {
    TestValidator.predicate(
      "description is non-empty string",
      typeof createdWidget.description === "string" &&
        createdWidget.description.length > 0,
    );
  }
}
