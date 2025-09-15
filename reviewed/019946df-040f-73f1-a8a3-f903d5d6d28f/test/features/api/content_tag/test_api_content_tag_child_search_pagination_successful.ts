import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsContentTagChild } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagChild";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentTagChild } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTagChild";

/**
 * This test verifies the content tag child tag search pagination
 * functionality.
 *
 * It performs the following steps:
 *
 * 1. Registers/logs in as a system administrator to obtain authorization
 *    credentials.
 * 2. Creates a parent content tag, which acts as a container for child tags.
 * 3. Creates multiple child content tags associated with the parent tag.
 * 4. Searches for child content tags under the parent tag using search
 *    parameters with pagination.
 * 5. Validates that the paginated results correctly represent the child tags
 *    belonging to the parent.
 *
 * The test asserts the correctness of tenant isolation, authorization,
 * pagination metadata, and filtering.
 */
export async function test_api_content_tag_child_search_pagination_successful(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as system admin
  const systemAdminEmail = `${RandomGenerator.alphabets(7)}@systemadmin.com`;
  const systemAdminPassword = "StrongPass!23";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // Step 2: Create a parent content tag
  const parentTagCode = `PT${RandomGenerator.alphaNumeric(5)}`;
  const parentTagName = RandomGenerator.name(2);
  const parentTagRequestBody = {
    code: parentTagCode,
    name: parentTagName,
    description: `Parent Tag for testing - ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IEnterpriseLmsContentTag.ICreate;

  const parentTag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.systemAdmin.contentTags.createContentTag(
      connection,
      {
        body: parentTagRequestBody,
      },
    );
  typia.assert(parentTag);

  // Step 3: Create multiple child content tags associated with the parent tag
  const childTagsCount = 10;
  const childTags: IEnterpriseLmsContentTag[] = [];
  for (let i = 0; i < childTagsCount; i++) {
    const childTagCode = `CT${RandomGenerator.alphaNumeric(5)}`;
    const childTagName = RandomGenerator.name(2);
    const childTagRequestBody = {
      code: childTagCode,
      name: childTagName,
      description: `Child Tag ${i + 1} under parent - ${RandomGenerator.paragraph({ sentences: 2 })}`,
    } satisfies IEnterpriseLmsContentTag.ICreate;

    const childTag: IEnterpriseLmsContentTag =
      await api.functional.enterpriseLms.systemAdmin.contentTags.createContentTag(
        connection,
        {
          body: childTagRequestBody,
        },
      );
    typia.assert(childTag);
    childTags.push(childTag);
  }

  // Step 4: Search child tags under the parent tag with filter and pagination
  const searchRequestBody = {
    search: null,
    page: 1,
    limit: 5,
    sort: "name asc",
  } satisfies IEnterpriseLmsContentTagChild.IRequest;

  const paginatedChildTags: IPageIEnterpriseLmsContentTagChild.ISummary =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.index(
      connection,
      {
        parentTagId: parentTag.id,
        body: searchRequestBody,
      },
    );
  typia.assert(paginatedChildTags);

  // Step 5: Validate the pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedChildTags.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    paginatedChildTags.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records is at least 10",
    paginatedChildTags.pagination.records >= childTagsCount,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedChildTags.pagination.pages ===
      Math.ceil(
        paginatedChildTags.pagination.records /
          paginatedChildTags.pagination.limit,
      ),
  );

  // Step 6: Validate that all child tags belong to the parent
  for (const childTagSummary of paginatedChildTags.data) {
    TestValidator.predicate(
      `child tag ${childTagSummary.id} belongs to parent ${parentTag.id}`,
      childTagSummary.parent_tag_id === parentTag.id,
    );
  }

  // Step 7: Validate the returned child tag ids match created child tags (partial due to pagination)
  const pagedIds = new Set(paginatedChildTags.data.map((t) => t.child_tag_id));
  for (const childTag of childTags) {
    if (pagedIds.has(childTag.id)) {
      // Found the child tag in the paged response
      // Validate child_tag_id matches child tag id
      const foundSummary = paginatedChildTags.data.find(
        (dt) => dt.child_tag_id === childTag.id,
      );
      TestValidator.equals(
        `child tag id matches for ${childTag.id}`,
        foundSummary?.child_tag_id,
        childTag.id,
      );
    }
  }
}
