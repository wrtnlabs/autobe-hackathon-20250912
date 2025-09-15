import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This scenario tests the creation of a new group project by an authenticated
 * corporate learner user within a tenant organization.
 *
 * Workflow:
 *
 * 1. Authenticate as a new corporate learner user via the
 *    /auth/corporateLearner/join endpoint to obtain authentication tokens.
 * 2. Use the obtained authentication tokens to create a new corporate learner
 *    group project by sending a POST request to
 *    /enterpriseLms/corporateLearner/groupProjects with valid group project
 *    data including tenant_id and owner_id associated with the logged-in
 *    learner user.
 * 3. Validate that the creation response includes the full group project details,
 *    correct tenant and owner linkage, and timestamps for creation.
 * 4. Validate business rules such as unique project code, valid tenant, and owner
 *    references.
 * 5. Test error handling by attempting creation with invalid tenant_id or
 *    owner_id.
 *
 * Success criteria: successful group project creation with accurate data
 * linkage and valid response codes; failure scenarios returned appropriately
 * with error messages.
 */
export async function test_api_corporatelearner_group_project_creation_success(
  connection: api.IConnection,
) {
  // 1. Authenticate a new corporate learner user
  // Generate tenant_id as a UUID string
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Prepare corporate learner create request body
  const corporateLearnerCreateBody = {
    tenant_id: tenantId,
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  // Call join API
  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreateBody,
    });
  typia.assert(corporateLearner);

  // 2. Create a new group project with the authenticated corporate learner
  // Initialize group project creation data including owner_id = corporateLearner.id
  const nowISO = new Date().toISOString();
  const plusOneMonthISO = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Required group project create data
  const groupProjectCreateBody = {
    tenant_id: tenantId,
    owner_id: corporateLearner.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 12,
    }),
    start_at: nowISO,
    end_at: plusOneMonthISO,
  } satisfies IEnterpriseLmsGroupProject.ICreate;

  // Create the group project
  const groupProject: IEnterpriseLmsGroupProject =
    await api.functional.enterpriseLms.corporateLearner.groupProjects.create(
      connection,
      { body: groupProjectCreateBody },
    );
  typia.assert(groupProject);

  // 3. Validate the group project creation response
  TestValidator.equals(
    "group project tenant id matches",
    groupProject.tenant_id,
    tenantId,
  );

  TestValidator.equals(
    "group project owner id matches",
    groupProject.owner_id,
    corporateLearner.id,
  );

  TestValidator.predicate(
    "group project title is non-empty",
    typeof groupProject.title === "string" && groupProject.title.length > 0,
  );

  // Description can be string or null, accept both
  TestValidator.predicate(
    "group project description is string or null",
    groupProject.description === null ||
      typeof groupProject.description === "string",
  );

  // Timestamps check - validate the format of ISO 8601 strings
  TestValidator.predicate(
    "group project start_at is valid date-time",
    typeof groupProject.start_at === "string" &&
      !Number.isNaN(Date.parse(groupProject.start_at)),
  );
  TestValidator.predicate(
    "group project end_at is valid date-time",
    typeof groupProject.end_at === "string" &&
      !Number.isNaN(Date.parse(groupProject.end_at)),
  );

  TestValidator.predicate(
    "group project created_at is valid date-time",
    typeof groupProject.created_at === "string" &&
      !Number.isNaN(Date.parse(groupProject.created_at)),
  );

  TestValidator.predicate(
    "group project updated_at is valid date-time",
    typeof groupProject.updated_at === "string" &&
      !Number.isNaN(Date.parse(groupProject.updated_at)),
  );

  // Optional deleted_at must be null or string or undefined
  TestValidator.predicate(
    "group project deleted_at is null or undefined or valid date-time",
    groupProject.deleted_at === null ||
      groupProject.deleted_at === undefined ||
      (typeof groupProject.deleted_at === "string" &&
        !Number.isNaN(Date.parse(groupProject.deleted_at))),
  );

  // Check tenant and owner linkage properties if defined
  if (groupProject.tenant !== undefined && groupProject.tenant !== null) {
    TestValidator.equals(
      "tenant id in nested tenant entity equals parent",
      groupProject.tenant.id,
      groupProject.tenant_id,
    );
  }

  if (groupProject.owner !== undefined && groupProject.owner !== null) {
    TestValidator.equals(
      "owner id in nested owner entity equals parent",
      groupProject.owner.id,
      groupProject.owner_id,
    );
  }

  // 4. Test error scenarios
  // Attempt creation with invalid tenant_id
  await TestValidator.error(
    "creation fails with invalid tenant_id",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.groupProjects.create(
        connection,
        {
          body: {
            tenant_id: "00000000-0000-0000-0000-000000000000",
            owner_id: corporateLearner.id,
            title: "Invalid tenant_id",
            start_at: nowISO,
            end_at: plusOneMonthISO,
          } satisfies IEnterpriseLmsGroupProject.ICreate,
        },
      );
    },
  );

  // Attempt creation with invalid owner_id
  await TestValidator.error(
    "creation fails with invalid owner_id",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.groupProjects.create(
        connection,
        {
          body: {
            tenant_id: tenantId,
            owner_id: "00000000-0000-0000-0000-000000000000",
            title: "Invalid owner_id",
            start_at: nowISO,
            end_at: plusOneMonthISO,
          } satisfies IEnterpriseLmsGroupProject.ICreate,
        },
      );
    },
  );
}
