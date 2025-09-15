import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

export async function test_api_create_data_source_sync_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor user joins and authenticates
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "password123";
  const editorCreateBody = {
    name: editorName,
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;
  const editorJoin: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorJoin);

  // 2. Editor login for role switching
  const editorLoginBody = {
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ILogin;
  const editorLogin: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLogin);

  // 3. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminpass123";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminJoin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminJoin);

  // 4. Admin login for authentication
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 5. Admin creates data source
  const dataSourceCreateBody = {
    name: `DataSource-${RandomGenerator.alphaNumeric(8)}`,
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: JSON.stringify({ host: "localhost", port: 3306 }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 6. Editor login again for role switching before sync creation
  const editorLoginAgain: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAgain);

  // 7. Editor creates a sync task
  const scheduledAt = new Date().toISOString();
  const syncCreateBody = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at: scheduledAt,
    status: "pending",
    started_at: null,
    completed_at: null,
    error_message: null,
  } satisfies IFlexOfficeDataSourceSync.ICreate;
  const dataSourceSync: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.editor.dataSources.syncs.createSync(
      connection,
      {
        dataSourceId: dataSource.id,
        body: syncCreateBody,
      },
    );
  typia.assert(dataSourceSync);

  // Validations
  TestValidator.equals(
    "DataSource ID matches in sync creation",
    dataSourceSync.flex_office_data_source_id,
    dataSource.id,
  );
  TestValidator.predicate(
    "Sync ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      dataSourceSync.id,
    ),
  );
  TestValidator.predicate(
    "Scheduled_at is valid ISO date-time",
    !Number.isNaN(Date.parse(dataSourceSync.scheduled_at)),
  );
}
