import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate updating a content creator/instructor account under
 * organizationAdmin with tenant validation.
 *
 * This includes authentication, account creation, updating mutable fields, and
 * verifying tenant restrictions. Covers success and failure cases including
 * duplicate emails and tenant_id modification attempts.
 */
export async function test_api_content_creator_instructor_update_with_auth_and_tenant_validation(
  connection: api.IConnection,
) {
  // 1. Authenticate organizationAdmin user and establish tenant context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Passw0rd!";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // Extract tenant_id from authenticated admin
  const tenantId = organizationAdmin.tenant_id;

  // 2. Create a contentCreatorInstructor account under the same tenant
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPasswordHash = RandomGenerator.alphaNumeric(32);
  const originalFirstName = RandomGenerator.name(1);
  const originalLastName = RandomGenerator.name(1);
  const originalStatus = "active";

  const contentCreatorInstructor: IEnterpriseLmsContentCreatorInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: originalEmail,
          password_hash: originalPasswordHash,
          first_name: originalFirstName,
          last_name: originalLastName,
          status: originalStatus,
        } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
      },
    );
  typia.assert(contentCreatorInstructor);

  // 3. Update mutable fields (first_name, last_name, email, status)
  const updatedFirstName = RandomGenerator.name(1);
  const updatedLastName = RandomGenerator.name(1);
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedStatus = originalStatus === "active" ? "suspended" : "active";

  const updatedInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.update(
      connection,
      {
        contentcreatorinstructorId: contentCreatorInstructor.id,
        body: {
          first_name: updatedFirstName,
          last_name: updatedLastName,
          email: updatedEmail,
          status: updatedStatus,
          // tenant_id update tested separately
        } satisfies IEnterpriseLmsContentCreatorInstructor.IUpdate,
      },
    );
  typia.assert(updatedInstructor);

  // Validate updated fields
  TestValidator.equals(
    "updated first_name should match",
    updatedInstructor.first_name,
    updatedFirstName,
  );
  TestValidator.equals(
    "updated last_name should match",
    updatedInstructor.last_name,
    updatedLastName,
  );
  TestValidator.equals(
    "updated email should match",
    updatedInstructor.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated status should match",
    updatedInstructor.status,
    updatedStatus,
  );
  TestValidator.equals(
    "tenant_id should remain unchanged",
    updatedInstructor.tenant_id,
    tenantId,
  );

  // 4. Failure scenario: create a second instructor with an email for duplicate email checking
  const duplicateEmailInstructor: IEnterpriseLmsContentCreatorInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: RandomGenerator.alphaNumeric(32),
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
      },
    );
  typia.assert(duplicateEmailInstructor);

  // Attempt to update original instructor's email to duplicate email, expect error
  await TestValidator.error(
    "should fail when updating email to duplicate email",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.update(
        connection,
        {
          contentcreatorinstructorId: contentCreatorInstructor.id,
          body: {
            email: duplicateEmailInstructor.email,
          } satisfies IEnterpriseLmsContentCreatorInstructor.IUpdate,
        },
      );
    },
  );

  // 5. Failure scenario: attempt to update tenant_id (invalid operation) to null or different tenant
  // Attempt update with tenant_id null
  await TestValidator.error(
    "should fail when setting tenant_id to null",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.update(
        connection,
        {
          contentcreatorinstructorId: contentCreatorInstructor.id,
          body: {
            tenant_id: null,
          } satisfies IEnterpriseLmsContentCreatorInstructor.IUpdate,
        },
      );
    },
  );

  // Attempt update with tenant_id different from original
  await TestValidator.error(
    "should fail when changing tenant_id to a different tenant",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.update(
        connection,
        {
          contentcreatorinstructorId: contentCreatorInstructor.id,
          body: {
            tenant_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IEnterpriseLmsContentCreatorInstructor.IUpdate,
        },
      );
    },
  );

  // 6. Failure scenario: attempt to update with no changes - should succeed but no changes
  const noChangeUpdate =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.update(
      connection,
      {
        contentcreatorinstructorId: contentCreatorInstructor.id,
        body: {} satisfies IEnterpriseLmsContentCreatorInstructor.IUpdate,
      },
    );
  typia.assert(noChangeUpdate);
  TestValidator.equals(
    "no change update retains original email",
    noChangeUpdate.email,
    updatedInstructor.email,
  );

  // 7. Success scenario: update only status to original
  const revertedStatusUpdate =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.update(
      connection,
      {
        contentcreatorinstructorId: contentCreatorInstructor.id,
        body: {
          status: originalStatus,
        } satisfies IEnterpriseLmsContentCreatorInstructor.IUpdate,
      },
    );
  typia.assert(revertedStatusUpdate);
  TestValidator.equals(
    "reverted status matches original",
    revertedStatusUpdate.status,
    originalStatus,
  );

  // 8. Validate timestamps updated accordingly
  TestValidator.predicate(
    "updated_at is updated to a later timestamp",
    new Date(revertedStatusUpdate.updated_at) >
      new Date(contentCreatorInstructor.updated_at),
  );

  // 9. Validate deleted_at remains unchanged (null or undefined)
  TestValidator.predicate(
    "deleted_at remains unchanged or null",
    revertedStatusUpdate.deleted_at === null ||
      revertedStatusUpdate.deleted_at === undefined,
  );

  // 10. Final comprehensive assertion of tenant isolation and authorization
  TestValidator.equals(
    "tenant_id remains consistent after all updates",
    revertedStatusUpdate.tenant_id,
    tenantId,
  );
}
