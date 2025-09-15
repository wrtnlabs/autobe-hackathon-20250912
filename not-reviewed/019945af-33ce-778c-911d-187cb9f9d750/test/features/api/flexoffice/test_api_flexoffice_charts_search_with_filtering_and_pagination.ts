import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeChart";

export async function test_api_flexoffice_charts_search_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new Editor user
  const editorEmail: string = typia.random<string & tags.Format<"email">>();
  const editorPassword: string = "Password123!";

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        email: editorEmail,
        name: RandomGenerator.name(),
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Log in as the Editor user
  const login: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(login);

  // Prepare valid filter values for charts search
  const chartTypes = ["bar", "line", "pie"] as const;
  const chosenChartType = RandomGenerator.pick(chartTypes);
  const randomTitleSearch = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 8 }),
  );
  const isoDateStart = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year ago
  const isoDateEnd = new Date().toISOString(); // current time

  // Helper to validate response pagination data
  function validatePagination(
    pagination: IPage.IPagination,
    page: number,
    limit: number,
    totalRecords: number,
  ) {
    TestValidator.equals("page current", pagination.current, page);
    TestValidator.equals("page limit", pagination.limit, limit);
    TestValidator.predicate(
      "page records non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate("page pages non-negative", pagination.pages >= 0);
    // pages * limit >= records
    TestValidator.predicate(
      "pages max check",
      pagination.pages * pagination.limit >= pagination.records,
    );
  }

  // 3. Test cases: Various filter & pagination combinations

  // Default search with no filters
  const page1 = 1;
  const limit1 = 10;
  {
    const body: IFlexOfficeChart.IRequest = {
      page: page1 satisfies number as number,
      limit: limit1 satisfies number as number,
      orderBy: "created_at",
      orderDir: "desc",
    };

    const result: IPageIFlexOfficeChart =
      await api.functional.flexOffice.editor.charts.index(connection, { body });
    typia.assert(result);
    validatePagination(
      result.pagination,
      page1,
      limit1,
      result.pagination.records,
    );

    // Check chart_type in results are valid string
    for (const chart of result.data) {
      TestValidator.predicate(
        "chart_type is non-empty string",
        typeof chart.chart_type === "string" && chart.chart_type.length > 0,
      );
    }
  }

  // Filter by specific chart_type
  {
    const body: IFlexOfficeChart.IRequest = {
      chart_type: chosenChartType as string,
      page: 1 satisfies number as number,
      limit: 20 satisfies number as number,
      orderBy: "created_at",
      orderDir: "asc",
    };

    const result: IPageIFlexOfficeChart =
      await api.functional.flexOffice.editor.charts.index(connection, { body });
    typia.assert(result);
    validatePagination(result.pagination, 1, 20, result.pagination.records);

    // All chart types must match filter
    for (const chart of result.data) {
      TestValidator.equals(
        "chart_type matches filter",
        chart.chart_type,
        chosenChartType,
      );
    }
  }

  // Search by title substring
  {
    const body: IFlexOfficeChart.IRequest = {
      title_search: randomTitleSearch,
      page: 1 satisfies number as number,
      limit: 15 satisfies number as number,
      orderBy: "created_at",
      orderDir: "asc",
    };

    const result: IPageIFlexOfficeChart =
      await api.functional.flexOffice.editor.charts.index(connection, { body });
    typia.assert(result);
    validatePagination(result.pagination, 1, 15, result.pagination.records);

    for (const chart of result.data) {
      TestValidator.predicate(
        "title contains search substring",
        chart.title.includes(randomTitleSearch),
      );
    }
  }

  // Pagination boundary: last page
  {
    const page = 2;
    const limit = 5;
    const body: IFlexOfficeChart.IRequest = {
      page: page satisfies number as number,
      limit: limit satisfies number as number,
      orderBy: "created_at",
      orderDir: "desc",
    };

    const result: IPageIFlexOfficeChart =
      await api.functional.flexOffice.editor.charts.index(connection, { body });
    typia.assert(result);
    validatePagination(
      result.pagination,
      page,
      limit,
      result.pagination.records,
    );
  }

  // 4. Unauthorized access - reset connection headers to simulate no auth
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated access rejected", async () => {
    await api.functional.flexOffice.editor.charts.index(unauthenticatedConn, {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      },
    });
  });
}
