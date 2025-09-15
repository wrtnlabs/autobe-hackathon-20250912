import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForum";

/**
 * Test the forum search and pagination functionality.
 *
 * Tests include retrieval of the forums list without filters, with search
 * filters, with pagination parameters, and with sorting orders. Validates
 * that the response conforms exactly to the expected paginated forums
 * summary structure. Ensures that pagination metadata and summary entities
 * are consistent.
 */
export async function test_api_forum_search_and_pagination(
  connection: api.IConnection,
) {
  // Retrieve forums with default parameters (no filters)
  const defaultResponse: IPageIEnterpriseLmsForum.ISummary =
    await api.functional.enterpriseLms.forums.index(connection, {
      body: {} satisfies IEnterpriseLmsForum.IRequest,
    });
  typia.assert(defaultResponse);

  // Validate pagination metadata fields
  TestValidator.predicate(
    "default pagination current page is non-negative",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination total records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination total pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );

  // Validate each forum summary
  for (const forum of defaultResponse.data) {
    typia.assert(forum);
    TestValidator.predicate(
      "forum id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        forum.id,
      ),
    );
    TestValidator.predicate(
      "forum name is not empty",
      typeof forum.name === "string" && forum.name.length > 0,
    );
    // description can be null or undefined or string - no further validation needed
  }

  // Retrieve forums with search filter
  const searchQuery =
    defaultResponse.data.length > 0
      ? RandomGenerator.substring(defaultResponse.data[0].name)
      : "test";
  const searchResponse: IPageIEnterpriseLmsForum.ISummary =
    await api.functional.enterpriseLms.forums.index(connection, {
      body: { search: searchQuery } satisfies IEnterpriseLmsForum.IRequest,
    });
  typia.assert(searchResponse);

  // Validate search response pagination
  TestValidator.predicate(
    "search pagination current page is non-negative",
    searchResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "search pagination limit is positive",
    searchResponse.pagination.limit > 0,
  );

  // Retrieve forums with pagination parameters
  const paginatedResponse: IPageIEnterpriseLmsForum.ISummary =
    await api.functional.enterpriseLms.forums.index(connection, {
      body: { page: 2, limit: 10 } satisfies IEnterpriseLmsForum.IRequest,
    });
  typia.assert(paginatedResponse);

  // Validate pagination metadata fields for paginated response
  TestValidator.equals(
    "pagination current page equals requested page",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    paginatedResponse.pagination.limit,
    10,
  );

  // Retrieve forums with sorting parameters
  const sortedResponseAsc: IPageIEnterpriseLmsForum.ISummary =
    await api.functional.enterpriseLms.forums.index(connection, {
      body: {
        sortField: "name",
        sortOrder: "asc",
      } satisfies IEnterpriseLmsForum.IRequest,
    });
  typia.assert(sortedResponseAsc);

  const sortedResponseDesc: IPageIEnterpriseLmsForum.ISummary =
    await api.functional.enterpriseLms.forums.index(connection, {
      body: {
        sortField: "created_at",
        sortOrder: "desc",
      } satisfies IEnterpriseLmsForum.IRequest,
    });
  typia.assert(sortedResponseDesc);

  // Additional order correctness checks could be added here if needed
}
