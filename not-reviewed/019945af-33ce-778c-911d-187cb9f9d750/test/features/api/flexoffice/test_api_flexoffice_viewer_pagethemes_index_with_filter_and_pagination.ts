import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";

export async function test_api_flexoffice_viewer_pagethemes_index_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Viewer registration (join) with realistic user data
  const viewerCreateBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1).replace(/ /g, "").toLowerCase()}@example.com`,
    password: "TestPassword123!",
  } satisfies IFlexOfficeViewer.ICreate;

  const createdViewer: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: viewerCreateBody,
    });
  typia.assert(createdViewer);

  // 2. Viewer login with the same credentials
  const viewerLoginBody = {
    email: viewerCreateBody.email,
    password: viewerCreateBody.password,
  } satisfies IFlexOfficeViewer.ILogin;

  const loggedInViewer: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: viewerLoginBody,
    });
  typia.assert(loggedInViewer);

  // 3. Prepare requests for different filter and pagination scenarios
  const requests: IFlexOfficePageTheme.IRequest[] = [
    // Empty filter and default pagination
    {},
    // Large limit to test large page size
    { limit: 100 } satisfies IFlexOfficePageTheme.IRequest,
    // Filter by a name substring (random substring from realistic name)
    {
      name: viewerCreateBody.name.substring(0, 2),
    } satisfies IFlexOfficePageTheme.IRequest,
    // Minimal limit and page 1
    { page: 1, limit: 1 } satisfies IFlexOfficePageTheme.IRequest,
    // Non-existent name string to expect empty results
    {
      name: "nonexistentfilterstring12345",
    } satisfies IFlexOfficePageTheme.IRequest,
  ];

  // 4. Execute each request and validate response
  for (const [index, req] of requests.entries()) {
    const response: IPageIFlexOfficePageTheme.ISummary =
      await api.functional.flexOffice.viewer.pageThemes.index(connection, {
        body: req,
      });
    typia.assert(response);

    // Validate pagination metadata consistency
    TestValidator.predicate(
      `request ${index} valid pagination current`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `request ${index} valid pagination limit`,
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `request ${index} valid pagination records`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `request ${index} valid pagination pages`,
      response.pagination.pages >= 0,
    );

    // Validate that each data entry is a valid summary with id and name
    for (const theme of response.data) {
      typia.assert(theme);
      TestValidator.predicate(
        `request ${index} theme id format`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          theme.id,
        ),
      );
      TestValidator.predicate(
        `request ${index} theme has name`,
        theme.name.length > 0,
      );

      // If a name filter is applied, ensure theme name includes the filter
      if (req.name != null && req.name !== "") {
        TestValidator.predicate(
          `request ${index} theme name contains filter`,
          theme.name.toLowerCase().includes(req.name.toLowerCase()),
        );
      }
    }
  }
}
