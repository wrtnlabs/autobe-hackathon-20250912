import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the deletion flow for a content creator instructor with proper
 * authentication.
 *
 * This test covers the entire lifecycle of an organization admin
 * authenticating, creating a content creator instructor, then deleting that
 * instructor's account. Also tests negative cases like deletion by
 * unauthorized roles and deletion of non-existent instructor IDs.
 *
 * Test Steps:
 *
 * 1. Organization admin joins and authenticates
 * 2. Organization admin creates a new content creator instructor account
 * 3. Organization admin deletes the created content creator instructor by ID
 * 4. Attempt deletion by unauthorized role (simulate by unauthenticated
 *    connection)
 * 5. Attempt deletion of non-existent content creator instructor ID
 *
 * Validations:
 *
 * - Each creation and deletion response is properly typed and validated
 * - Errors are thrown for unauthorized deletion attempts and non-existent IDs
 */
export async function test_api_content_creator_instructor_deletion_flow_with_authentication(
  connection: api.IConnection,
) {
  // 1. Authenticate organization admin user
  // Create a new organizationAdmin user account to obtain auth token
  const organizationAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.pick([
      "enterprise.admin@example.com",
      "admin@enterprise.org",
      "orgadmin@lms.com",
    ] as const),
    password: "StrongPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBody,
    });
  typia.assert(organizationAdmin);

  // 2. Create a new content creator instructor
  const contentCreatorCreateBody = {
    tenant_id: organizationAdmin.tenant_id,
    email: RandomGenerator.pick([
      "instructor1@contentcreator.com",
      "creator2@enterprise.com",
      "teacher3@lms.org",
    ] as const),
    password_hash: "StrongPasswordHashed123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorInstructor: IEnterpriseLmsContentCreatorInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: contentCreatorCreateBody,
      },
    );
  typia.assert(contentCreatorInstructor);

  // 3. Delete the created content creator instructor
  await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.eraseContentcreatorinstructors(
    connection,
    {
      contentcreatorinstructorId: contentCreatorInstructor.id,
    },
  );

  // 4. Negative test: Deletion attempt by unauthorized role results in error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.eraseContentcreatorinstructors(
        unauthenticatedConnection,
        {
          contentcreatorinstructorId: contentCreatorInstructor.id,
        },
      );
    },
  );

  // 5. Negative test: Deletion of non-existent content creator instructor ID should fail
  await TestValidator.error(
    "delete non-existent content creator instructor should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.eraseContentcreatorinstructors(
        connection,
        {
          contentcreatorinstructorId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );

  // End of test
}
