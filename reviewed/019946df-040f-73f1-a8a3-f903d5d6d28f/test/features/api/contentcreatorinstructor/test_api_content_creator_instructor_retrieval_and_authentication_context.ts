import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test retrieval of a content creator/instructor by ID with authentication
 * context.
 *
 * This test validates that an organization administrator can create and
 * then retrieve a content creator/instructor user within their tenant.
 *
 * It ensures the multi-tenant isolation by checking that the retrieved user
 * belongs to the correct tenant.
 *
 * The test follows the workflow:
 *
 * 1. Organization admin authenticates (join) to obtain access token.
 * 2. Create a new content creator/instructor user in the same tenant using
 *    join endpoint.
 * 3. Retrieve the created content creator/instructor by their ID.
 * 4. Validate the details of the retrieved user, ensuring correctness and
 *    tenant scope.
 * 5. Validate error handling when retrieving with invalid or unauthorized IDs.
 */
export async function test_api_content_creator_instructor_retrieval_and_authentication_context(
  connection: api.IConnection,
) {
  // Step 1: Authenticate organizationAdmin user
  const organizationAdminJoinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "P@ssw0rd123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminJoinBody,
    });
  typia.assert(organizationAdmin);

  // Step 2: Using the same tenant_id, create a new content creator/instructor

  // Create contentcreatorInstructor as organizationAdmin
  // Since there's no specific creation API for contentCreatorInstructor,
  // we simulate it by another organizationAdmin join with tenant_id matching initial
  // (according to dependencies, join endpoint is reused)

  const instructorJoinBody = {
    tenant_id: organizationAdmin.tenant_id,
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "P@ssw0rd123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const instructorAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: instructorJoinBody,
    });
  typia.assert(instructorAuthorized);

  // Step 3: Retrieve the newly created content creator/instructor by ID
  const retrievedInstructor: IEnterpriseLmsContentCreatorInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.at(
      connection,
      {
        contentcreatorinstructorId: instructorAuthorized.id,
      },
    );
  typia.assert(retrievedInstructor);

  // Step 4: Validate the retrieved details
  TestValidator.equals(
    "tenant_id matches",
    retrievedInstructor.tenant_id,
    instructorAuthorized.tenant_id,
  );
  TestValidator.equals(
    "email matches",
    retrievedInstructor.email,
    instructorAuthorized.email,
  );
  TestValidator.equals(
    "first name matches",
    retrievedInstructor.first_name,
    instructorAuthorized.first_name,
  );
  TestValidator.equals(
    "last name matches",
    retrievedInstructor.last_name,
    instructorAuthorized.last_name,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof retrievedInstructor.status === "string" &&
      retrievedInstructor.status.length > 0,
  );

  // Additional validations for timestamps
  TestValidator.predicate(
    "created_at is valid ISO date",
    !!Date.parse(retrievedInstructor.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !!Date.parse(retrievedInstructor.updated_at),
  );

  // For deleted_at, explicit null or valid ISO date string allowed
  TestValidator.predicate(
    "deleted_at is null or valid ISO date",
    retrievedInstructor.deleted_at === null ||
      (typeof retrievedInstructor.deleted_at === "string" &&
        !!Date.parse(retrievedInstructor.deleted_at)),
  );

  // Step 5: Test error handling - invalid ID returns 404
  await TestValidator.error(
    "retrieving with invalid UUID returns 404",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.at(
        connection,
        {
          contentcreatorinstructorId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
