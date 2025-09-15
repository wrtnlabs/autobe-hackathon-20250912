import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test validates the lifecycle of a content creator/instructor
 * user account being deleted by a system administrator. It includes:
 *
 * 1. SystemAdmin user registration and authentication
 * 2. OrganizationAdmin user registration and authentication
 * 3. Creation of a content creator/instructor user under the authorized
 *    OrganizationAdmin
 * 4. Attempted deletion by unauthorized OrganizationAdmin user (should fail)
 * 5. Successful deletion by authorized SystemAdmin user
 * 6. Attempting repeated deletion of the same content creator (should fail)
 *
 * Detailed authorization switchings and error validations are performed to
 * ensure robust enforcement of permissions and business rules.
 */
export async function test_api_content_creator_instructor_deletion_by_system_admin(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user registration
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreateBody,
  });
  typia.assert(systemAdmin);

  // 2. SystemAdmin user login for role switching (simulate session refresh)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminCreateBody.email,
      password_hash: systemAdminCreateBody.password_hash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 3. OrganizationAdmin user registration
  const orgAdminCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminCreateBody,
    },
  );
  typia.assert(orgAdmin);

  // 4. OrganizationAdmin user login for role switching
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminCreateBody.email,
      password: orgAdminCreateBody.password,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 5. Create contentCreatorInstructor user under OrganizationAdmin
  const contentCreatorCreateBody = {
    tenant_id: orgAdmin.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreatorInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: contentCreatorCreateBody,
      },
    );
  typia.assert(contentCreatorInstructor);

  // 6. Attempt deletion of content creator instructor as unauthorized OrganizationAdmin (should fail)
  await TestValidator.error(
    "unauthorized OrganizationAdmin cannot delete content creator instructor",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentcreatorinstructors.eraseContentcreatorinstructors(
        connection,
        { contentcreatorinstructorId: contentCreatorInstructor.id },
      );
    },
  );

  // 7. Switch role back to SystemAdmin for authorized deletion
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminCreateBody.email,
      password_hash: systemAdminCreateBody.password_hash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 8. Successful deletion by SystemAdmin
  await api.functional.enterpriseLms.systemAdmin.contentcreatorinstructors.eraseContentcreatorinstructors(
    connection,
    {
      contentcreatorinstructorId: contentCreatorInstructor.id,
    },
  );

  // 9. Attempt to delete the same content creator instructor again (should fail)
  await TestValidator.error(
    "cannot delete non-existent content creator instructor",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentcreatorinstructors.eraseContentcreatorinstructors(
        connection,
        { contentcreatorinstructorId: contentCreatorInstructor.id },
      );
    },
  );
}
