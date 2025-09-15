import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

export async function test_api_data_source_sync_get_success_editor(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = RandomGenerator.alphaNumeric(8);

  const editorCreated: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorCreated);

  // 2. Create a new data source under admin authorization
  // Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);

  const adminCreated: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // Admin login to ensure authorization context
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // Create the data source as admin
  const dataSourceInput = {
    name: `DS_${RandomGenerator.alphaNumeric(6)}`,
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: "sample-connection-info",
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSourceCreated: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceInput,
    });
  typia.assert(dataSourceCreated);

  // 3. Switch back to editor authorization context
  const editorLoggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLoggedIn);

  // 4. Create a sync task for the above data source as editor
  const now = new Date();
  const scheduledAt = now.toISOString();

  const syncTaskInput = {
    flex_office_data_source_id: dataSourceCreated.id,
    scheduled_at: scheduledAt,
    started_at: null,
    completed_at: null,
    status: "pending",
    error_message: null,
  } satisfies IFlexOfficeDataSourceSync.ICreate;

  const syncCreated: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.editor.dataSources.syncs.createSync(
      connection,
      {
        dataSourceId: dataSourceCreated.id,
        body: syncTaskInput,
      },
    );
  typia.assert(syncCreated);

  // 5. Retrieve sync task details via editor GET endpoint
  const syncRetrieved: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.editor.dataSources.syncs.atSync(
      connection,
      {
        dataSourceId: dataSourceCreated.id,
        syncId: syncCreated.id,
      },
    );
  typia.assert(syncRetrieved);

  // 6. Assert consistency between created and retrieved sync task
  TestValidator.equals(
    "sync id should match",
    syncRetrieved.id,
    syncCreated.id,
  );
  TestValidator.equals(
    "data source id should match",
    syncRetrieved.flex_office_data_source_id,
    dataSourceCreated.id,
  );
  TestValidator.equals(
    "scheduled_at should match",
    syncRetrieved.scheduled_at,
    syncTaskInput.scheduled_at,
  );
  TestValidator.equals(
    "started_at should match",
    syncRetrieved.started_at,
    syncTaskInput.started_at,
  );
  TestValidator.equals(
    "completed_at should match",
    syncRetrieved.completed_at,
    syncTaskInput.completed_at,
  );
  TestValidator.equals(
    "status should match",
    syncRetrieved.status,
    syncTaskInput.status,
  );
  TestValidator.equals(
    "error_message should match",
    syncRetrieved.error_message,
    syncTaskInput.error_message,
  );
}
