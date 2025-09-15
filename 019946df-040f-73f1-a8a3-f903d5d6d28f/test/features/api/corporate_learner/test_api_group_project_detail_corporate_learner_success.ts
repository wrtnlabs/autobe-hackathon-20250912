import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Verify retrieval of a group project details by a corporate learner
 * ensuring proper authentication, authorization, and tenant scoping.
 *
 * Steps:
 *
 * 1. Register a new corporate learner with valid tenant id and email.
 * 2. Login with the same credentials to obtain authorization token.
 * 3. Fetch a group project detail by its UUID via GET endpoint.
 * 4. Validate the returned project belongs to the learner's tenant.
 * 5. Validate all relevant project detail fields are properly returned.
 *
 * The test ensures success response for valid group project and authorized
 * tenant.
 */
export async function test_api_group_project_detail_corporate_learner_success(
  connection: api.IConnection,
) {
  // Step 1: Register a corporate learner
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = RandomGenerator.alphaNumeric(10) + "@example.com";
  const password = "P@ssword123";

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const learner = await api.functional.auth.corporateLearner.join(connection, {
    body: createBody,
  });
  typia.assert(learner);

  TestValidator.equals(
    "learner tenant id matches registration",
    learner.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "learner email matches registration",
    learner.email,
    email,
  );

  // Step 2: Login as the registered corporate learner
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedIn = await api.functional.auth.corporateLearner.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedIn);

  TestValidator.equals("logged in email matches", loggedIn.email, email);
  TestValidator.equals(
    "logged in tenant id matches",
    loggedIn.tenant_id,
    tenantId,
  );

  // Step 3: Retrieve a group project by id (use an existing or fake UUID)
  // Since we do not have a create project API, we generate a random UUID for test
  const groupProjectId = typia.random<string & tags.Format<"uuid">>();

  // Call the GET endpoint to get group project details
  const project =
    await api.functional.enterpriseLms.corporateLearner.groupProjects.at(
      connection,
      {
        groupProjectId: groupProjectId,
      },
    );

  typia.assert(project);

  // Step 4: Validate the project belongs to the same tenant as the learner
  TestValidator.equals(
    "project tenant id matches learner tenant id",
    project.tenant_id,
    tenantId,
  );

  // Step 5: Validate key properties of the project
  TestValidator.equals(
    "project id matches requested id",
    project.id,
    groupProjectId,
  );

  TestValidator.predicate("project has valid start and end dates", () => {
    const start = new Date(project.start_at).getTime();
    const end = new Date(project.end_at).getTime();
    return start < end;
  });

  TestValidator.predicate(
    "project has created_at earlier or equal to updated_at",
    () => {
      const created = new Date(project.created_at).getTime();
      const updated = new Date(project.updated_at).getTime();
      return created <= updated;
    },
  );
}
