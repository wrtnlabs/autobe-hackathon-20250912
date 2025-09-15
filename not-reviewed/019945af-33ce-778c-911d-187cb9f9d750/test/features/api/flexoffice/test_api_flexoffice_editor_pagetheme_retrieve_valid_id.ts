import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * This E2E test verifies that an editor user can create, retrieve, and validate
 * a UI page theme detail by its ID with proper authorization.
 *
 * It covers user registration, login, page theme creation, retrieval, and
 * asserts that the returned data matches the created resource. Negative
 * scenarios test malformed UUID, non-existent IDs, and unauthorized access
 * ensuring the API correctly handles error cases.
 */
export async function test_api_flexoffice_editor_pagetheme_retrieve_valid_id(
  connection: api.IConnection,
) {
  // Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const authorizedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(authorizedEditor);

  // Login as the created editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loggedInEditor);

  // Create a new page theme
  const pageThemeCreateBody = {
    name: `test-theme-${RandomGenerator.alphaNumeric(5)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IFlexOfficePageTheme.ICreate;

  const createdTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.editor.pageThemes.create(connection, {
      body: pageThemeCreateBody,
    });
  typia.assert(createdTheme);

  // Retrieve created page theme by ID
  const retrievedTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.editor.pageThemes.at(connection, {
      pageThemeId: createdTheme.id,
    });
  typia.assert(retrievedTheme);

  // Validate retrieved data matches created data
  TestValidator.equals(
    "retrieved pageTheme.id matches created theme",
    retrievedTheme.id,
    createdTheme.id,
  );
  TestValidator.equals(
    "retrieved pageTheme.name matches created theme",
    retrievedTheme.name,
    createdTheme.name,
  );
  TestValidator.equals(
    "retrieved pageTheme.description matches created theme",
    retrievedTheme.description,
    createdTheme.description ?? null,
  );

  // Negative test: malformed UUID
  await TestValidator.error(
    "retrieval with malformed UUID should fail",
    async () => {
      await api.functional.flexOffice.editor.pageThemes.at(connection, {
        pageThemeId: "invalid-uuid-format",
      });
    },
  );

  // Negative test: non-existent UUID
  await TestValidator.error(
    "retrieval with non-existent UUID should fail",
    async () => {
      await api.functional.flexOffice.editor.pageThemes.at(connection, {
        pageThemeId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Negative test: unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "retrieval with unauthorized connection should fail",
    async () => {
      await api.functional.flexOffice.editor.pageThemes.at(unauthConn, {
        pageThemeId: createdTheme.id,
      });
    },
  );
}
