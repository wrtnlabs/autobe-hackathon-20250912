import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTagChild } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagChild";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This scenario tests the retrieval of a child content tag under a specific
 * parent content tag.
 *
 * 1. System administrator joins and logs in.
 * 2. Parent and child content tags are simulated with generated UUIDs (tag
 *    creation API not available).
 * 3. A hierarchical link between the parent and child content tags is created
 *    using createChildTag API.
 * 4. The created child tag is retrieved using its parentTagId and childTagId via
 *    GET.
 * 5. Validate the response data for correctness including UUID format checks.
 * 6. Attempt unauthorized access with unauthenticated connection and verify errors
 *    are thrown.
 * 7. Try accessing with invalid or incorrect IDs and check error handling.
 *
 * This full E2E test validates both happy path and error scenarios, including
 * security and data consistency.
 */
export async function test_api_systemadmin_content_tags_child_tags_retrieval_success(
  connection: api.IConnection,
) {
  // 1. SystemAdmin join and login
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: "hashed_password_1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Login with the same credentials
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoginAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 2. Simulate parent and child tags with random UUIDs (since APIs to create tags are not provided)
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const childTagId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create the child-parent hierarchy link using createChildTag API
  const createChildTagBody = {
    parent_tag_id: parentTagId,
    child_tag_id: childTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.ICreate;

  const hierarchy: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId,
        body: createChildTagBody,
      },
    );
  typia.assert(hierarchy);
  typia.assert<string & tags.Format<"uuid">>(hierarchy.id);

  TestValidator.equals(
    "parentTagId in hierarchy",
    hierarchy.parent_tag_id,
    parentTagId,
  );
  TestValidator.equals(
    "childTagId in hierarchy",
    hierarchy.child_tag_id,
    childTagId,
  );

  // 4. Retrieve the child tag by (parentTagId, childTagId) using at API
  const retrievedChildTag: IEnterpriseLmsContentTagChild =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.at(
      connection,
      {
        parentTagId,
        childTagId,
      },
    );
  typia.assert(retrievedChildTag);
  typia.assert<string & tags.Format<"uuid">>(retrievedChildTag.id);

  TestValidator.equals(
    "parent_tag_id of retrieved child tag",
    retrievedChildTag.parent_tag_id,
    hierarchy.parent_tag_id,
  );
  TestValidator.equals(
    "child_tag_id of retrieved child tag",
    retrievedChildTag.child_tag_id,
    hierarchy.child_tag_id,
  );

  // 5. Unauthorized access test with connection having empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access must throw error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.at(
        unauthenticatedConnection,
        {
          parentTagId,
          childTagId,
        },
      );
    },
  );

  // 6. Access with invalid parentTagId should throw error
  await TestValidator.error(
    "invalid parentTagId should cause error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.at(
        connection,
        {
          parentTagId: typia.random<string & tags.Format<"uuid">>(),
          childTagId,
        },
      );
    },
  );

  // 7. Access with invalid childTagId should throw error
  await TestValidator.error(
    "invalid childTagId should cause error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.at(
        connection,
        {
          parentTagId,
          childTagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Note: Tenant isolation validation is not feasible since tenant info is not exposed
}
