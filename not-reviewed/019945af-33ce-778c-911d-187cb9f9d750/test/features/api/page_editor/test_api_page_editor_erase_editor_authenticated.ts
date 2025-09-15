import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This test validates the deletion of a page editor session by an
 * authenticated editor user.
 *
 * It performs the following steps:
 *
 * 1. Registers a new editor user with realistic test credentials.
 * 2. Logs in as the editor user to establish the authentication context.
 * 3. Generates valid UUIDs for a page and a page editor session.
 * 4. Deletes the page editor session using the API, verifying no error is
 *    thrown.
 *
 * These steps ensure the deletion API is authorized correctly and the soft
 * deletion of a page editor session works as intended.
 */
export async function test_api_page_editor_erase_editor_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const createBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IFlexOfficeEditor.ICreate;

  const authorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Log in as the editor user
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Generate UUIDs for pageId and pageEditorId
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const pageEditorId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the page editor session by pageId and pageEditorId
  await api.functional.flexOffice.editor.pages.pageEditors.erase(connection, {
    pageId: pageId,
    pageEditorId: pageEditorId,
  });

  // No output to assert for erase endpoint (void), but no exception means success
}
