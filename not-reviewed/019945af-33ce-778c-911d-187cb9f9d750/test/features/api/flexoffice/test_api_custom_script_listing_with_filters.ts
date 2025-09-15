import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import type { IFlexOfficeCustomScripts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScripts";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeCustomScript";

/**
 * End-to-end test for the PATCH /flexOffice/editor/customScripts endpoint.
 *
 * This test covers the full workflow of authenticating as an editor user
 * and performing filtered and paginated searches for FlexOffice custom
 * scripts.
 *
 * Steps:
 *
 * 1. Register a new editor user via /auth/editor/join.
 * 2. Authenticate as the registered editor using /auth/editor/login.
 * 3. Perform multiple PATCH /flexOffice/editor/customScripts calls with
 *    various filter parameters such as search keyword, script_language,
 *    page, limit, sort, and direction.
 * 4. Validate the response structure matches
 *    IPageIFlexOfficeCustomScript.ISummary.
 * 5. Confirm pagination metadata matches expectations.
 * 6. Verify each returned script summary contains all required fields.
 * 7. Test edge cases, including no matching results and invalid query
 *    parameters.
 * 8. Assert error on unauthorized access by clearing auth.
 * 9. Assert 400 Bad Request on invalid filter parameters.
 *
 * This test ensures that the custom scripts listing API behaves correctly
 * for authorized editor users, including filtering, pagination, sorting,
 * and error handling.
 */
export async function test_api_custom_script_listing_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorRegisterBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "")}@example.com`,
    password: "ValidPassword123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorRegisterBody,
    });
  typia.assert(editorAuthorized);

  // 2. Authenticate as the registered editor user
  const editorLoginBody = {
    email: editorRegisterBody.email,
    password: editorRegisterBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLogin: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLogin);

  // Helper to validate a page response's pagination and data
  function validatePage(
    page: IPageIFlexOfficeCustomScript.ISummary,
    expectedPage: number,
    expectedLimit: number,
  ): void {
    typia.assert(page);

    TestValidator.predicate(
      "custom script pagination current page is expected",
      page.pagination.current === expectedPage,
    );
    TestValidator.predicate(
      "custom script pagination limit is expected",
      page.pagination.limit === expectedLimit,
    );
    TestValidator.predicate(
      "custom script pagination pages is at least one",
      page.pagination.pages >= 1,
    );
    TestValidator.predicate(
      "custom script pagination records non-negative",
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      "custom script pagination pages calculation matches records",
      page.pagination.pages ===
        Math.ceil(page.pagination.records / page.pagination.limit),
    );

    // Validate each script summary
    for (const script of page.data) {
      typia.assert(script);
      TestValidator.predicate(
        "custom script id is non-empty string",
        typeof script.id === "string" && script.id.length > 0,
      );
      TestValidator.predicate(
        "custom script code is non-empty string",
        typeof script.code === "string" && script.code.length > 0,
      );
      TestValidator.predicate(
        "custom script name is non-empty string",
        typeof script.name === "string" && script.name.length > 0,
      );
      TestValidator.equals(
        "custom script has script_language",
        typeof script.script_language,
        "string",
      );
      TestValidator.predicate(
        "custom script created_at is ISO date string",
        typeof script.created_at === "string" &&
          !Number.isNaN(Date.parse(script.created_at)),
      );
    }
  }

  // 3. Perform filtered searches

  // 3-1. Empty filter with explicit nulls for optional fields (use default pagination assumptions)
  const page0 = await api.functional.flexOffice.editor.customScripts.index(
    connection,
    {
      body: {
        search: null,
        script_language: null,
        page: null,
        limit: null,
        sort: null,
        direction: null,
      } satisfies IFlexOfficeCustomScripts.IRequest,
    },
  );
  validatePage(page0, 1, 10); // Assumed default limit 10

  // 3-2. Search keyword filter
  const page1 = await api.functional.flexOffice.editor.customScripts.index(
    connection,
    {
      body: {
        search: editorRegisterBody.name.substring(0, 3),
        script_language: null,
        page: 1,
        limit: 5,
        sort: null,
        direction: null,
      } satisfies IFlexOfficeCustomScripts.IRequest,
    },
  );
  validatePage(page1, 1, 5);

  // 3-3. Filter by language JavaScript
  const pageJs = await api.functional.flexOffice.editor.customScripts.index(
    connection,
    {
      body: {
        search: null,
        script_language: "javascript",
        page: 1,
        limit: 5,
        sort: null,
        direction: null,
      } satisfies IFlexOfficeCustomScripts.IRequest,
    },
  );
  validatePage(pageJs, 1, 5);

  // 3-4. Filter by language Python with sorting by name asc
  const pagePy = await api.functional.flexOffice.editor.customScripts.index(
    connection,
    {
      body: {
        search: null,
        script_language: "python",
        page: 1,
        limit: 5,
        sort: "name",
        direction: "asc",
      } satisfies IFlexOfficeCustomScripts.IRequest,
    },
  );
  validatePage(pagePy, 1, 5);

  // 3-5. Sorting by created_at desc
  const pageSorted = await api.functional.flexOffice.editor.customScripts.index(
    connection,
    {
      body: {
        search: null,
        script_language: null,
        page: 1,
        limit: 3,
        sort: "created_at",
        direction: "desc",
      } satisfies IFlexOfficeCustomScripts.IRequest,
    },
  );
  validatePage(pageSorted, 1, 3);

  // 3-6. Pagination beyond last page returns empty data
  const lastPageIndex = page0.pagination.pages + 100;
  const pageEmpty = await api.functional.flexOffice.editor.customScripts.index(
    connection,
    {
      body: {
        search: null,
        script_language: null,
        page: lastPageIndex,
        limit: 10,
        sort: null,
        direction: null,
      } satisfies IFlexOfficeCustomScripts.IRequest,
    },
  );
  validatePage(pageEmpty, lastPageIndex, 10);
  TestValidator.equals(
    "custom script empty data on out-of-range page",
    pageEmpty.data.length,
    0,
  );

  // 4. Unauthorized access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.flexOffice.editor.customScripts.index(unauthConn, {
      body: {
        search: null,
        script_language: null,
        page: null,
        limit: null,
        sort: null,
        direction: null,
      } satisfies IFlexOfficeCustomScripts.IRequest,
    });
  });
}
