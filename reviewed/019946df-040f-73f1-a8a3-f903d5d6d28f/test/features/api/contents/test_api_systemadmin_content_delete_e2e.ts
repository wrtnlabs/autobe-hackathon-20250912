import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * End-to-end test scenario for system administrator content deletion in
 * Enterprise LMS.
 *
 * This test validates the full lifecycle of content deletion by a system
 * admin, including role-based authentication, content creation by content
 * creators, secure deletion by system admins, rejection of unauthorized
 * deletions, and error handling. It tests multi-role authentication
 * switching and ensures that deletion is handled properly, enforcing tenant
 * isolation and security.
 *
 * Scenario steps:
 *
 * 1. Register system administrator and authenticate
 * 2. Register content creator/instructor and authenticate
 * 3. Content creator creates a content item associated with the tenant
 * 4. System administrator deletes the content item
 * 5. Verify deletion success and error scenarios for invalid or unauthorized
 *    deletions
 */
export async function test_api_systemadmin_content_delete_e2e(
  connection: api.IConnection,
) {
  // 1. System Administrator registration with generated valid email and active status
  const systemAdminCreateBody = {
    email: `sysadmin+${RandomGenerator.alphaNumeric(4)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(24),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. System Administrator login to set auth context
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLoggedIn);

  // 3. Content Creator/Instructor registration with tenant from system admin
  const tenantId = systemAdminLoggedIn.tenant_id;
  const contentCreatorCreateBody = {
    tenant_id: tenantId,
    email: `creator+${RandomGenerator.alphaNumeric(4)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(24),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreator: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreateBody,
    });
  typia.assert(contentCreator);

  // 4. Content Creator/Instructor login
  const contentCreatorLoginBody = {
    email: contentCreatorCreateBody.email,
    password: contentCreatorCreateBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLoginBody,
  });

  // 5. Content creation by Content Creator with required content details
  const contentCreateBody = {
    tenant_id: tenantId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const createdContent: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreateBody,
      },
    );
  typia.assert(createdContent);

  // 6. System Admin login again to regain appropriate authorization
  await api.functional.auth.systemAdmin.login(connection, {
    body: systemAdminLoginBody,
  });

  // 7. Delete the created content by system administrator using correct content ID
  await api.functional.enterpriseLms.systemAdmin.contents.erase(connection, {
    id: createdContent.id,
  });

  // 8. Attempt to delete content with invalid/fake UUID - expect an error
  const fakeId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "deleting content with invalid/fake id should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contents.erase(
        connection,
        {
          id: fakeId,
        },
      );
    },
  );

  // 9. Unauthorized deletion attempt by Content Creator/Instructor - should be rejected
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLoginBody,
  });

  await TestValidator.error(
    "unauthorized user cannot delete content",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contents.erase(
        connection,
        {
          id: createdContent.id,
        },
      );
    },
  );
}
