import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";

/**
 * This test ensures the content creator/instructor role can create a child
 * content tag relationship below a parent tag within their tenant.
 *
 * Workflow:
 *
 * 1. Register two different content creator/instructor users in the tenant
 *    context.
 * 2. Each user logs in to obtain valid auth tokens.
 * 3. One user creates a parent content tag (simulating the taxonomy term).
 * 4. The other user creates a child content tag within the same tenant.
 * 5. Using one user's auth context, create the parent-child tag hierarchy
 *    (relationship).
 * 6. Validate the response fields and confirm the hierarchy is created
 *    properly with parent and child IDs.
 * 7. Attempt to create the same relationship again to confirm that duplicate
 *    linkage is disallowed (should produce an error).
 * 8. Attempt creation of a child tag hierarchy with another user's auth token
 *    for cross-tenant isolation check (should fail with error).
 *
 * The test guarantees tenant isolation, auth enforcement, and correct
 * linkage creation.
 */

export async function test_api_contentcreatorinstructor_content_tags_child_tag_creation_success(
  connection: api.IConnection,
) {
  // Generate realistic tenant UUID
  const tenantId = typia.random<string & tags.Format<"uuid">>();

  // Generate unique emails for two users
  const userEmailOne = `userone.${RandomGenerator.alphaNumeric(6)}@testtenant.com`;
  const userEmailTwo = `usertwo.${RandomGenerator.alphaNumeric(6)}@testtenant.com`;

  // Common password hash placeholder (pre-hashed)
  const passwordHash = "hashedpassword123";

  // 1. Register first content creator/instructor user
  const userOne: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: userEmailOne,
        password_hash: passwordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(userOne);

  // 2. Register second content creator/instructor user
  const userTwo: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: userEmailTwo,
        password_hash: passwordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(userTwo);

  // 3. Login as user one to get auth token (simulate switch to user one credentials)
  const loginOne: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: {
        email: userEmailOne,
        password: "password", // login expects plain password, even if join used hash
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    });
  typia.assert(loginOne);

  // 4. Login as user two for second user context
  const loginTwo: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: {
        email: userEmailTwo,
        password: "password",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    });
  typia.assert(loginTwo);

  // 5. Assume two content tags already created for parent and child manually with UUIDs; in test use random UUIDs
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const childTagId = typia.random<string & tags.Format<"uuid">>();

  // 6. Using user one's auth context (already set in connection via SDK), create child tag hierarchy relationship
  const hierarchyCreateRequest = {
    parent_tag_id: parentTagId,
    child_tag_id: childTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.ICreate;

  // Compose the props with parentTagId path and body for child tag hierarchy creation
  // Use user one's auth token
  await (async () => {
    // Patch connection headers for user one authorization
    // The SDK manages auth by internal header control, so calling login sets headers automatically
    // Calling again does not affect, so simulate user one's session
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: {
        email: userEmailOne,
        password: "password",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    });

    // Create child tag hierarchy
    const createdHierarchy: IEnterpriseLmsContentTagHierarchy =
      await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.childTags.createChildTag(
        connection,
        {
          parentTagId: parentTagId,
          body: hierarchyCreateRequest,
        },
      );
    typia.assert(createdHierarchy);

    // Validate response parentTagId and childTagId equal to request values
    TestValidator.equals(
      "parentTagId matches",
      createdHierarchy.parent_tag_id,
      hierarchyCreateRequest.parent_tag_id,
    );
    TestValidator.equals(
      "childTagId matches",
      createdHierarchy.child_tag_id,
      hierarchyCreateRequest.child_tag_id,
    );

    // 7. Confirm duplicate relation creation yields error
    await TestValidator.error(
      "duplicate child tag hierarchy creation should fail",
      async () => {
        await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.childTags.createChildTag(
          connection,
          {
            parentTagId: parentTagId,
            body: hierarchyCreateRequest,
          },
        );
      },
    );
  })();

  // 8. Switch to user two's auth and attempt to create same hierarchy, expect error due to tenant isolation or authorization failure
  await (async () => {
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: {
        email: userEmailTwo,
        password: "password",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    });

    await TestValidator.error(
      "cross-tenant or unauthorized child tag hierarchy creation should fail",
      async () => {
        await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.childTags.createChildTag(
          connection,
          {
            parentTagId: parentTagId,
            body: hierarchyCreateRequest,
          },
        );
      },
    );
  })();
}
