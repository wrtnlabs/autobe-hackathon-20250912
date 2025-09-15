import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageComment";

/**
 * Test scenario for admin retrieving page comments with filters.
 *
 * 1. Create admin user and authenticate.
 * 2. Use a test pageId (random UUID) as page identifier.
 * 3. Prepare various filter conditions with editor ID, search string, pagination.
 * 4. Call the PATCH pageComments API.
 * 5. Assert response conforms to expected pagination and data structure.
 */
export async function test_api_page_comment_list_by_admin_with_filters(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin_password_1234";

  const adminCreated: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // 2. Admin login
  const adminLogged: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogged);

  // 3. Prepare test pageId
  const pageId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare filter request body
  // Pick an editor_id or leave undefined(null) to test filtering, simulate search and pagination
  const editorIdSample = typia.random<string & tags.Format<"uuid">>();
  const searchPhrase = RandomGenerator.substring(
    "Review comment example content for filtering test.",
  );
  const pageNumber = 1;
  const pageLimit = 10;

  const requestBody = {
    editor_id: editorIdSample,
    search: searchPhrase,
    page: pageNumber,
    limit: pageLimit,
  } satisfies IFlexOfficePageComment.IRequest;

  // 5. Call pageComments API
  const response: IPageIFlexOfficePageComment.ISummary =
    await api.functional.flexOffice.admin.pages.pageComments.index(connection, {
      pageId,
      body: requestBody,
    });

  // 6. Assert response type
  typia.assert(response);

  // Validate pagination
  TestValidator.predicate(
    "pagination.current is correct",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is correct",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is correct",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is correct",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );

  // Check comment data
  for (const comment of response.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment.content is string",
      typeof comment.content === "string",
    );
    TestValidator.predicate(
      "comment.id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        comment.id,
      ),
    );
    TestValidator.predicate(
      "comment.editor_id matches filter",
      comment.editor_id === editorIdSample,
    );
  }
}
