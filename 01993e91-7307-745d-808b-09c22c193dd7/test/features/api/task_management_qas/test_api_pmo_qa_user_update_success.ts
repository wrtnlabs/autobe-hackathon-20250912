import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This test performs a realistic end-to-end scenario of updating a QA (Quality
 * Assurance) user entity by a PMO (Project Management Officer) user.
 *
 * The test includes these crucial steps:
 *
 * 1. Register a new PMO user (pmo join) to create an authorized administrative
 *    user.
 * 2. Register a QA user (qa join) whose profile will be updated.
 * 3. Login as PMO user to establish authorization context for the update action.
 * 4. Perform the profile update for the QA user using the PMO authorization.
 * 5. Validate that the update response conforms exactly to expected types and that
 *    the update effect is correct.
 *
 * This workflow ensures comprehensive coverage of the update endpoint,
 * validates role-based access control, and tests the preservation of data
 * integrity and compliance with business logic constraints.
 */
export async function test_api_pmo_qa_user_update_success(
  connection: api.IConnection,
) {
  // 1. Register a PMO user and authenticate
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. Register a QA user to be updated
  const qaJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaJoinBody });
  typia.assert(qaUser);

  // 3. Login as PMO user to ensure authorization context for update
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLogin);

  // 4. Update the QA user’s profile through PMO authorization
  // Prepare update body; according to ITaskManagementQa.IUpdate schema only updated_at is optional
  // We will pass updated_at with current ISO string.
  const updateBody = {
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementQa.IUpdate;

  const updatedQaUser: ITaskManagementQa =
    await api.functional.taskManagement.pmo.taskManagement.qas.update(
      connection,
      { id: qaUser.id, body: updateBody },
    );
  typia.assert(updatedQaUser);

  // 5. Validate consistency with original QA user except updated_at
  TestValidator.equals("QA user id consistency", updatedQaUser.id, qaUser.id);
  TestValidator.equals(
    "QA user email consistency",
    updatedQaUser.email,
    qaUser.email,
  );
  TestValidator.equals(
    "QA user name consistency",
    updatedQaUser.name,
    qaUser.name,
  );

  // The updated_at value should differ because it was just updated
  TestValidator.notEquals(
    "QA user updated_at changed",
    updatedQaUser.updated_at,
    qaUser.updated_at,
  );

  // 6. Validate timestamps validity
  // updated_at format validated by typia.assert, additionally check it’s recent (within last 10 minutes)
  const updatedAtDate = new Date(updatedQaUser.updated_at);
  const now = new Date();
  const tenMinutesMillis = 10 * 60 * 1000;
  TestValidator.predicate(
    "updated_at recent",
    now.getTime() - updatedAtDate.getTime() < tenMinutesMillis,
  );
}
