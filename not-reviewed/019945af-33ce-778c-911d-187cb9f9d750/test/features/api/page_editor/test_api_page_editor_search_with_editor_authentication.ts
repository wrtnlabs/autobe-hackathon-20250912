import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageEditor";

export async function test_api_page_editor_search_with_editor_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new editor user to obtain authorization tokens.
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: `editor${Date.now()}@example.com`,
    password: "securePass123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const createResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(createResponse);

  // 2. Log in as the editor user to initialize authorization context.
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginResponse);

  // 3. Perform a valid search for active page editors with pagination.
  // Use pagination page=1 and limit=10; no filters (page_id and editor_id null).
  const searchRequestAll = {
    page: 1,
    limit: 10,
    page_id: null,
    editor_id: null,
  } satisfies IFlexOfficePageEditor.IRequest;

  const searchAllResponse: IPageIFlexOfficePageEditor.ISummary =
    await api.functional.flexOffice.editor.pageEditors.search(connection, {
      body: searchRequestAll,
    });
  typia.assert(searchAllResponse);

  // Validate pagination metadata.
  TestValidator.predicate(
    "pagination current page must be 1",
    searchAllResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be 10",
    searchAllResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages must be positive or zero",
    searchAllResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records must be positive or zero",
    searchAllResponse.pagination.records >= 0,
  );

  // 4. If any data exists, validate the properties of each page editor session.
  if (searchAllResponse.data.length > 0) {
    for (const session of searchAllResponse.data) {
      TestValidator.predicate(
        "page editor session id is non-empty string",
        typeof session.id === "string" && session.id.length > 0,
      );
      TestValidator.predicate(
        "page_id has valid uuid format",
        typeof session.page_id === "string" &&
          /^[0-9a-f\-]{36}$/.test(session.page_id),
      );
      TestValidator.predicate(
        "editor_id has valid uuid format",
        typeof session.editor_id === "string" &&
          /^[0-9a-f\-]{36}$/.test(session.editor_id),
      );
    }
  }

  // 5. Test search with filters: valid page_id and editor_id from existing data if available.
  if (searchAllResponse.data.length > 0) {
    const sampleSession = RandomGenerator.pick(searchAllResponse.data);
    const filteredSearchRequest = {
      page: 1,
      limit: 5,
      page_id: sampleSession.page_id,
      editor_id: sampleSession.editor_id,
    } satisfies IFlexOfficePageEditor.IRequest;

    const filteredSearchResponse: IPageIFlexOfficePageEditor.ISummary =
      await api.functional.flexOffice.editor.pageEditors.search(connection, {
        body: filteredSearchRequest,
      });
    typia.assert(filteredSearchResponse);

    // Validate all returned sessions match the filter.
    for (const session of filteredSearchResponse.data) {
      TestValidator.equals(
        "filtered search: page_id matches",
        session.page_id,
        filteredSearchRequest.page_id,
      );
      TestValidator.equals(
        "filtered search: editor_id matches",
        session.editor_id,
        filteredSearchRequest.editor_id,
      );
    }
  }

  // 6. Test unauthorized requests using a fresh connection without auth tokens.
  const freshConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access without tokens should fail",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.search(
        freshConnection,
        {
          body: searchRequestAll,
        },
      );
    },
  );

  // 7. Test invalid input scenarios
  const invalidRequests = [
    { page: -1, limit: 10, page_id: null, editor_id: null },
    { page: 1, limit: 0, page_id: null, editor_id: null },
    { page: 1, limit: 10, page_id: "not-a-uuid", editor_id: null },
    { page: 1, limit: 10, page_id: null, editor_id: "invalid-uuid" },
  ];

  for (const invalidRequest of invalidRequests) {
    const req = invalidRequest satisfies IFlexOfficePageEditor.IRequest;
    await TestValidator.error(
      `validation error for request: ${JSON.stringify(invalidRequest)}`,
      async () => {
        await api.functional.flexOffice.editor.pageEditors.search(connection, {
          body: req,
        });
      },
    );
  }
}
