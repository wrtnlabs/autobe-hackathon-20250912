import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * This test validates the successful creation of a new page editor session on a
 * FlexOffice UI page by an authenticated admin.
 *
 * The test follows these steps:
 *
 * 1. Create and authenticate a new admin user via /auth/admin/join.
 * 2. Create a UI page to obtain a valid pageId.
 * 3. Create a page editor session associating the admin user with the page.
 *
 * Validation includes strict type assertions, UUID format checks, and date-time
 * validation.
 */
export async function test_api_admin_page_editor_session_creation_successful(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const email = RandomGenerator.alphaNumeric(10) + "@testcompany.com";
  const adminCreateBody = {
    email: email,
    password: "StrongPa$$word123",
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a new UI page
  const pageCreateBody = {
    name: "Test Page " + RandomGenerator.alphaNumeric(5),
    description: null,
    status: "draft",
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 3. Create a page editor session associating admin as editor
  const pageEditorCreateBody = {
    page_id: page.id,
    editor_id: admin.id,
  } satisfies IFlexOfficePageEditor.ICreate;

  const pageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.admin.pages.pageEditors.create(connection, {
      pageId: page.id,
      body: pageEditorCreateBody,
    });
  typia.assert(pageEditor);

  // Validate the data correspondence
  TestValidator.equals("page ID matches", pageEditor.page_id, page.id);
  TestValidator.equals("editor ID matches", pageEditor.editor_id, admin.id);
  TestValidator.predicate(
    "session has valid ID format",
    /^[0-9a-fA-F-]{36}$/.test(pageEditor.id),
  );
  TestValidator.predicate(
    "created_at and updated_at are valid ISO date-time",
    !isNaN(Date.parse(pageEditor.created_at)) &&
      !isNaN(Date.parse(pageEditor.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    pageEditor.deleted_at === null || pageEditor.deleted_at === undefined,
    true,
  );
}
