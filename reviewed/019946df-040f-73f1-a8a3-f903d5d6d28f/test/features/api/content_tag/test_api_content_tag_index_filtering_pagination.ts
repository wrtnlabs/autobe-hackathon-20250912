import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";

/**
 * End-to-end test for the content tag indexing endpoint with filtering and
 * pagination.
 *
 * This test performs a full user journey starting with registering (joining) a
 * content creator or instructor in a multitenant environment. Upon successful
 * authentication, it tests the content tag index endpoint with various filters
 * and pagination options, including searching by code and name, testing
 * pagination boundaries, and validating empty result handling.
 *
 * Additionally, it tests unauthorized access failure with an unauthenticated
 * connection.
 *
 * Validation is done through typia.assert for response types and TestValidator
 * for business logic checks including pagination correctness and data
 * integrity.
 *
 * The test ensures precise adherence to API schema, business rules, and
 * security requirements for content classification management.
 *
 * Steps:
 *
 * 1. Register content creator/instructor user
 * 2. Retrieve content tags with default paging
 * 3. Retrieve content tags with search filters and sorting
 * 4. Retrieve content tags expecting empty results
 * 5. Validate unauthorized access error
 *
 * All inputs comply with format requirements like UUIDs and emails. All API
 * calls use proper await to ensure correct async behavior.
 */
export async function test_api_content_tag_index_filtering_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as content creator/instructor (join operation)
  const authorized: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(64),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(authorized);

  // UUID regex constant for reuse
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // 2. Test default paging and no filters
  const defaultRequest: IEnterpriseLmsContentTag.IRequest = {
    search: null,
    code: null,
    name: null,
    description: null,
    page: 1,
    limit: 10,
    order_by: "code",
    order_direction: "asc",
  };

  const page1: IPageIEnterpriseLmsContentTag.ISummary =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.indexContentTag(
      connection,
      { body: defaultRequest },
    );
  typia.assert(page1);

  TestValidator.predicate("page1 data array exists", Array.isArray(page1.data));
  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page1 pagination fields non-negative",
    page1.pagination.current >= 1 &&
      page1.pagination.limit >= 0 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );

  // 3. Test filter by name search and limited pagination
  const filteredRequest: IEnterpriseLmsContentTag.IRequest = {
    search: "test",
    code: null,
    name: "example",
    description: null,
    page: 1,
    limit: 5,
    order_by: "name",
    order_direction: "desc",
  };

  const page2 =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.indexContentTag(
      connection,
      { body: filteredRequest },
    );
  typia.assert(page2);

  TestValidator.predicate("page2 data array exists", Array.isArray(page2.data));
  TestValidator.equals("page2 pagination current", page2.pagination.current, 1);
  TestValidator.equals("page2 pagination limit", page2.pagination.limit, 5);

  // Validate each item structure and UUID format
  for (const item of page2.data) {
    typia.assert<IEnterpriseLmsContentTag.ISummary>(item);
    TestValidator.predicate(
      "item id matches UUID format",
      UUID_REGEX.test(item.id),
    );
  }

  // 4. Test empty result with search terms that are unlikely to match
  const emptyRequest: IEnterpriseLmsContentTag.IRequest = {
    search: "nonexistentsearchterm",
    code: "nonexistentcode",
    name: "nonexistentname",
    description: "nonexistentdescription",
    page: 1,
    limit: 10,
    order_by: "code",
    order_direction: "asc",
  };

  const page3 =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.indexContentTag(
      connection,
      { body: emptyRequest },
    );
  typia.assert(page3);
  TestValidator.equals(
    "page3 data length is zero for empty search",
    page3.data.length,
    0,
  );

  // 5. Test unauthorized request returns error
  // Use a copy of connection without authentication headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized call should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.indexContentTag(
      unauthConn,
      { body: defaultRequest },
    );
  });
}
